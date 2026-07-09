import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * POST /api/admin/orders/verify-slip
 * Admin verifies or rejects a customer-uploaded payment slip.
 * 
 * Body: { orderId: string, action: "approve" | "reject", reason?: string }
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderId, action, reason } = await req.json() as {
      orderId: string;
      action: "approve" | "reject";
      reason?: string;
    };

    if (!orderId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "ต้องระบุ orderId และ action (approve/reject)" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    // Verify order exists and is in slip_uploaded status
    const order = await db.prepare(
      "SELECT id, paymentStatus, totalPrice, userId, serviceId, address, deliveryFee FROM orders WHERE id = ?"
    ).bind(orderId).first() as any;

    if (!order) {
      return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
    }

    if (order.paymentStatus !== "slip_uploaded") {
      return NextResponse.json({ 
        error: `ออเดอร์นี้ไม่ได้อยู่ในสถานะรอตรวจสลิป (สถานะปัจจุบัน: ${order.paymentStatus})` 
      }, { status: 400 });
    }

    if (action === "approve") {
      // ═══ APPROVE: Mark as paid + dispatch to Rubbers ═══
      await db.prepare(`
        UPDATE orders 
        SET paymentStatus = 'paid',
            status = 'searching_driver',
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(orderId).run();

      console.log(`✅ Admin ${session} approved slip for order ${orderId}`);

      // Update payment_logs
      try {
        await db.prepare(
          "UPDATE payment_logs SET status = 'approved_by_admin' WHERE orderId = ? AND gateway = 'manual_slip'"
        ).bind(orderId).run();
      } catch (e) { console.error("Payment log update error:", e); }

      // Notify customer
      try {
        const { createNotification } = await import("@/lib/notify-server");
        await createNotification(db, {
          userId: order.userId,
          userType: "customer",
          type: "order_update",
          title: "✅ ยืนยันการชำระเงินแล้ว",
          message: `งาน #${orderId.slice(-6)} — ฿${order.totalPrice} ได้รับการยืนยันแล้ว กำลังหา Rubber ให้คุณ`,
          link: `/orders/${orderId}`
        });
      } catch (e) { console.error("Customer notification error:", e); }

      // Dispatch to Rubbers
      try {
        const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
        await broadcastToEligibleRubbers(
          db, env, orderId,
          order.address,
          order.deliveryFee || 0,
          'paid',
          false
        );
        console.log(`📡 Dispatched order ${orderId} to rubbers after slip approval`);
      } catch (e) {
        console.error("Dispatch after slip approval failed:", e);
      }

      return NextResponse.json({ 
        success: true, 
        message: "ยืนยันสลิปสำเร็จ — กำลังหา Rubber",
        newStatus: "paid"
      });

    } else {
      // ═══ REJECT: Mark as rejected + notify customer ═══
      await db.prepare(`
        UPDATE orders 
        SET paymentStatus = 'slip_rejected',
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(orderId).run();

      console.log(`❌ Admin ${session} rejected slip for order ${orderId}: ${reason || "no reason"}`);

      // Update payment_logs
      try {
        await db.prepare(
          "UPDATE payment_logs SET status = 'rejected_by_admin' WHERE orderId = ? AND gateway = 'manual_slip'"
        ).bind(orderId).run();
      } catch (e) { console.error("Payment log update error:", e); }

      // Notify customer
      try {
        const { createNotification } = await import("@/lib/notify-server");
        await createNotification(db, {
          userId: order.userId,
          userType: "customer",
          type: "order_update",
          title: "❌ สลิปไม่ผ่านการตรวจสอบ",
          message: reason 
            ? `งาน #${orderId.slice(-6)} — ${reason} กรุณาชำระเงินอีกครั้ง`
            : `งาน #${orderId.slice(-6)} — กรุณาชำระเงินอีกครั้งหรือติดต่อแอดมิน`,
          link: `/orders/${orderId}`
        });
      } catch (e) { console.error("Customer notification error:", e); }

      return NextResponse.json({ 
        success: true, 
        message: "ปฏิเสธสลิปแล้ว — แจ้งลูกค้าเรียบร้อย",
        newStatus: "slip_rejected"
      });
    }
  } catch (error: unknown) {
    console.error("Verify slip error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
