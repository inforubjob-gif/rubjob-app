import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/payment/skip-test
 * 🧪 DEV ONLY — Simulates a successful payment for testing the full order lifecycle.
 * Marks the order as 'paid' and triggers the geo-filtered rubber broadcast.
 */
export async function POST(req: Request) {
  try {
    const { orderId } = (await req.json()) as { orderId: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ error: "DB not found" }, { status: 500 });
    }

    // 1. Verify order exists and is still pending payment
    const order = await db.prepare(
      "SELECT id, paymentStatus, userId, totalPrice, serviceId, address, deliveryFee FROM orders WHERE id = ?"
    ).bind(orderId).first() as any;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json({ success: true, message: "Already paid (skipped)" });
    }

    // 2. Mark as paid — identical to what Stripe webhook does
    await db.prepare(`
      UPDATE orders 
      SET paymentStatus = 'paid', 
          updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(orderId).run();

    console.log(`🧪 [TEST] Order ${orderId} marked as PAID (skipped payment)`);

    // 3. Send customer confirmation (same as webhook)
    try {
      const orderData = await db.prepare(`
        SELECT o.deliveryFee, o.userId, o.totalPrice, o.serviceId, o.address,
               s.name as serviceName, p.title as gigName
        FROM orders o
        LEFT JOIN services s ON o.serviceId = s.id
        LEFT JOIN provider_services p ON o.serviceId = p.id
        WHERE o.id = ?
      `).bind(orderId).first() as any;

      if (orderData) {
        let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
        if (!customerToken) {
          const setting = await db.prepare(
            "SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'"
          ).first() as any;
          if (setting?.value) customerToken = setting.value;
        }

        if (customerToken && orderData.userId) {
          const serviceName = orderData.serviceName || orderData.gigName || "Laundry Service";
          const { sendLinePush, bookingConfirmationFlex } = await import("@/lib/line");
          sendLinePush(
            orderData.userId,
            [bookingConfirmationFlex(orderId, serviceName, orderData.totalPrice || 0)],
            customerToken
          ).catch(err => console.error("Customer push error (skip-test):", err));
        }

        // 4. Geo-Filtered Broadcast to rubbers
        const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
        await broadcastToEligibleRubbers(
          db, env, orderId,
          orderData.address,
          orderData.deliveryFee || 0,
          "pending"
        );
      }
    } catch (e) {
      console.error("Skip-test broadcast error:", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Order ${orderId} marked as paid (test mode)` 
    });
  } catch (error: any) {
    console.error("Skip-test error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
