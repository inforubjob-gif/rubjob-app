import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/payment/skip-test
 * Skips payment for TEST orders only.
 * Marks the order as paid + confirmed, then broadcasts to test rubbers.
 */
export async function POST(req: Request) {
  try {
    const { orderId } = await req.json() as any;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Verify order exists and is a test order
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first() as any;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!order.isTest) {
      return NextResponse.json({ error: "Only test orders can skip payment" }, { status: 403 });
    }
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    // 2. Update order status
    await db.prepare(`
      UPDATE orders SET paymentStatus = 'paid', status = 'confirmed' WHERE id = ?
    `).bind(orderId).run();

    // 3. Broadcast to test rubbers
    try {
      const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
      await broadcastToEligibleRubbers(
        db,
        env,
        orderId,
        order.address,
        order.totalPrice,
        order.userId,
        true // isTestOrder
      );
    } catch (e) {
      console.error("Test skip-payment broadcast error:", e);
    }

    return NextResponse.json({ success: true, orderId, status: "confirmed" });
  } catch (error: unknown) {
    console.error("Skip test payment error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
