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
    const { status, pickupDriverId, deliveryDriverId, storeId, staffNote, paymentStatus } = body;
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

    // Handle status transition (with LINE notifications)
    if (status) {
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Admin order update error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

