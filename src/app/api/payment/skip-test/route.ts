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

    // 2. Mark as paid AND change status to searching_driver — identical to what Stripe webhook should do
    await db.prepare(`
      UPDATE orders 
      SET paymentStatus = 'paid', 
          status = 'searching_driver',
          updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(orderId).run();

    console.log(`🧪 [TEST] Order ${orderId} marked as PAID (skipped payment)`);

    // 3. Send customer confirmation + rubber broadcast
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
        const serviceName = orderData.serviceName || orderData.gigName || "Laundry Service";
        
        // 3a. In-App Notification for Customer (always works)
        try {
          const { createNotification } = await import("@/lib/notify-server");
          await createNotification(db, {
            userId: orderData.userId,
            userType: "customer",
            type: "order_update",
            title: "✅ ชำระเงินสำเร็จ",
            message: `งาน #${orderId.slice(-6)} — ${serviceName} ฿${orderData.totalPrice} ได้รับการยืนยันแล้ว กำลังจัดหาไรเดอร์...`,
            link: `/orders/${orderId}`
          });
          console.log(`🧪 [SKIP-TEST] Customer in-app notification sent to ${orderData.userId}`);
        } catch (e) {
          console.error("Customer in-app notification error:", e);
        }

        // 3b. LINE Push to Customer via Customer OA
        let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
        if (!customerToken) {
          const setting = await db.prepare(
            "SELECT value FROM system_settings WHERE key = 'line_token_regular'"
          ).first() as any;
          if (setting?.value) customerToken = setting.value;
        }

        if (customerToken && orderData.userId) {
          const { sendLinePush, bookingConfirmationFlex } = await import("@/lib/line");
          sendLinePush(
            orderData.userId,
            [bookingConfirmationFlex(orderId, serviceName, orderData.totalPrice || 0)],
            customerToken
          ).catch(err => console.error("🧪 [SKIP-TEST] Customer LINE push error:", err));
        } else {
          console.warn("🧪 [SKIP-TEST] No LINE token — customer LINE push skipped");
        }

        // 4. Geo-Filtered Broadcast to rubbers (LINE + In-App)
        console.log(`🧪 [SKIP-TEST] Starting rubber broadcast for order ${orderId}...`);
        const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
        await broadcastToEligibleRubbers(
          db, env, orderId,
          orderData.address,
          orderData.deliveryFee || 0,
          "paid"  // ← Was "pending" — this fixes the rubber notification showing wrong status
        );

        // 5. Notify Admin LINE group — PAYMENT CONFIRMED (not "new order")
        try {
          const groupId = env.LINE_ADMIN_GROUP_ID;
          const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN_HELP || env.LINE_CHANNEL_ACCESS_TOKEN;
          if (groupId && accessToken) {
            await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                to: groupId,
                messages: [{
                  type: "text",
                  text: `✅ ยืนยันชำระเงินแล้ว (Test)\nรหัส: ${orderId}\nบริการ: ${serviceName}\nราคา: ฿${orderData.totalPrice}\n\nสถานะ: จ่ายแล้ว → กำลังจัดหาไรเดอร์`
                }]
              })
            });
            console.log(`🧪 [SKIP-TEST] Admin payment confirmation sent`);
          }
        } catch (e) {
          console.error("Admin notification error:", e);
        }
      } else {
        console.error(`🧪 [SKIP-TEST] Could not fetch order data for ${orderId}`);
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
