import { safeError } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getAdminSession } from "@/lib/auth-server";
import { transitionOrderStatus } from "@/lib/order-logic";

export const runtime = "edge";

/**
 * PATCH /api/admin/orders/[id]
 * Admin Command Center — update status, assign riders/stores, add notes, skip payment
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, pickupDriverId, deliveryDriverId, storeId, staffNote, paymentStatus, refundBankName, refundAccountNumber, refundAccountName, rebroadcastType } = body;
    const env = getRequestContext().env;
    const db = env.DB;

    // Build dynamic update query for field assignments
    const fields: string[] = [];
    const values: any[] = [];

    if (pickupDriverId !== undefined) { fields.push("pickupDriverId = ?"); values.push(pickupDriverId || null); }
    if (deliveryDriverId !== undefined) { fields.push("deliveryDriverId = ?"); values.push(deliveryDriverId || null); }
    if (storeId !== undefined) { fields.push("storeId = ?"); values.push(storeId || null); }
    if (staffNote !== undefined) { fields.push("staffNote = ?"); values.push(staffNote); }
    if (paymentStatus !== undefined) { fields.push("paymentStatus = ?"); values.push(paymentStatus); }

    if (fields.length > 0) {
      fields.push("updatedAt = CURRENT_TIMESTAMP");
      const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`;
      values.push(id);
      await db.prepare(query).bind(...values).run();
    }

    // If admin is marking payment as 'paid' (skip payment for testing),
    // trigger driver broadcast just like the payment webhook would
    if (paymentStatus === "paid") {
      try {
        const order = await db.prepare(
          "SELECT address, deliveryFee FROM orders WHERE id = ?"
        ).bind(id).first() as any;

        if (order) {
          const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
          const orderAddress = (() => {
            try { return typeof order.address === "string" ? JSON.parse(order.address) : order.address; }
            catch { return null; }
          })();
          await broadcastToEligibleRubbers(
            db, env, id,
            orderAddress,
            order.deliveryFee || 0,
            "pending"
          );
        }
      } catch (err) {
        console.error("Admin skip-payment broadcast error:", err);
        // Non-fatal: payment status was already updated
      }
    }

    // If admin requests re-broadcast (emergency driver change)
    if (rebroadcastType === 'pickup' || rebroadcastType === 'delivery') {
      // Clear old driver assignment
      const driverField = rebroadcastType === 'pickup' ? 'pickupDriverId' : 'deliveryDriverId';
      await db.prepare(`UPDATE orders SET ${driverField} = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).bind(id).run();

      try {
        const order = await db.prepare(
          "SELECT address, deliveryFee, status FROM orders WHERE id = ?"
        ).bind(id).first() as any;

        if (order) {
          const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
          const orderAddress = (() => {
            try { return typeof order.address === "string" ? JSON.parse(order.address) : order.address; }
            catch { return null; }
          })();

          // Delete old dispatch logs so dedup doesn't block re-broadcast
          await db.prepare(
            `DELETE FROM webhook_logs WHERE id LIKE ? AND channel IN ('dispatch_success', 'dispatch_webpush', 'dispatch_fail')`
          ).bind(`DISPATCH-${id}-%`).run().catch(() => {});

          await broadcastToEligibleRubbers(
            db, env, id,
            orderAddress,
            order.deliveryFee || 0,
            order.status || 'pending'
          );
        }
      } catch (err) {
        console.error("Admin rebroadcast error:", err);
      }
    }

    // Handle status transition (with LINE notifications)
    if (status) {
      if (status === 'cancelled') {
        // Fetch order to check if it was paid
        const order = await db.prepare("SELECT userId, paymentStatus, totalPrice FROM orders WHERE id = ?").bind(id).first() as any;
        if (order && order.paymentStatus === 'paid') {
          const { nanoid } = await import("nanoid");
          const refundId = `RFD-C-${nanoid(8).toUpperCase()}`;
          // Queue refund request with awaiting_info status — customer must provide bank details
          await db.prepare(`
            INSERT INTO payout_requests (id, requesterId, requesterType, amount, bankName, accountNumber, accountName, status, notes)
            VALUES (?, ?, 'customer_refund', ?, 'รอข้อมูลจากลูกค้า', 'รอข้อมูล', 'รอข้อมูล', 'awaiting_info', ?)
          `).bind(
            refundId, 
            order.userId, 
            order.totalPrice, 
            `Refund for Order ${id}`
          ).run();

          // Change payment status to refund_pending
          await db.prepare("UPDATE orders SET paymentStatus = 'refund_pending', updatedAt = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();

          // Send LINE message to customer requesting bank account info
          try {
            const { sendLinePush, refundAccountRequestFlex } = await import("@/lib/line");
            const user = await db.prepare("SELECT id FROM users WHERE id = ?").bind(order.userId).first() as any;
            if (user) {
              const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
              if (accessToken) {
                await sendLinePush(order.userId, [refundAccountRequestFlex(id, order.totalPrice)], accessToken);
              }
            }
          } catch (lineErr) {
            console.error("Failed to send refund LINE notification:", lineErr);
          }
        }
      }

      const result = await transitionOrderStatus(
        db,
        id,
        status,
        env
      );
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
    }

    // 📒 Audit Log
    try {
      const { nanoid } = await import("nanoid");
      const changes = Object.keys(body).filter(k => body[k] !== undefined).join(', ');
      await db.prepare(`INSERT INTO audit_logs (id, adminId, adminName, action, targetType, targetId, details) VALUES (?, ?, ?, ?, 'order', ?, ?)`)
        .bind(`AUD-${nanoid(8)}`, (session as any).id || 'unknown', (session as any).name || 'Admin', `order_update`, id, `Changed: ${changes}`).run();
    } catch (e) { console.error("Audit log error:", e); }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Admin order update error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

