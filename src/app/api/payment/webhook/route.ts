import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/payment/webhook
 * Handles Beam Webhook Events (charge.succeeded, etc.)
 */
export async function POST(req: Request) {
  const env = getRequestContext().env;
  const db = env?.DB;

  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  try {
    const body = await req.json() as any;

    // Beam webhook payload contains event type and charge data
    const eventType = body.event || body.type;
    const chargeData = body.data || body;

    console.log(`Beam webhook received: ${eventType}`, JSON.stringify(body).slice(0, 500));

    // Handle charge succeeded
    if (eventType === "charge.succeeded" || chargeData.status === "SUCCEEDED") {
      // Beam returns referenceId as a top-level field on the charge object
      // Try multiple paths to handle different Beam payload versions
      const orderId = chargeData.referenceId
        || chargeData.order?.referenceId
        || chargeData.metadata?.orderId
        || body.referenceId;

      if (!orderId) {
        console.error(`❌ Beam webhook: charge.succeeded but could NOT extract orderId! Full payload:`, JSON.stringify(body));
      }

      if (orderId) {
        // Update Order Status in D1
        await db.prepare(`
          UPDATE orders 
          SET paymentStatus = 'paid', 
              status = 'searching_driver',
              updatedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).bind(orderId).run();

        console.log(`✅ Order ${orderId} marked as PAID via Beam Webhook`);

        // 📒 Log successful payment
        try {
          const { nanoid } = await import("nanoid");
          const chargeId = chargeData.id || chargeData.chargeId || '';
          const chargeAmount = (chargeData.amount || 0) / 100;
          await db.prepare(`INSERT INTO payment_logs (id, orderId, gateway, chargeId, amount, status, webhookEvent, rawResponse) VALUES (?, ?, 'beam', ?, ?, 'success', 'charge.succeeded', ?)`)
            .bind(`PAY-${nanoid(8)}`, orderId, chargeId, chargeAmount, JSON.stringify({ id: chargeId, status: 'SUCCEEDED' })).run();
        } catch (e) { console.error("Payment log error:", e); }

        // Broadcast to Online Rubbers via LINE (Geo-Filtered)
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

            // In-App Notification for Customer (always works)
            try {
              const { createNotification } = await import("@/lib/notify-server");
              await createNotification(db, {
                userId: orderData.userId,
                userType: "customer",
                type: "order_update",
                title: "✅ ชำระเงินสำเร็จ",
                message: `งาน #${orderId.slice(-6)} — ${serviceName} ฿${orderData.totalPrice} ได้รับการยืนยันแล้ว`,
                link: `/orders/${orderId}`
              });
            } catch (e) {
              console.error("Customer in-app notification error:", e);
            }

            // LINE Push to Customer via Customer OA
            let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
            if (!customerToken) {
              const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_token_regular'").first() as any;
              if (setting?.value) customerToken = setting.value;
            }
            
            if (customerToken && orderData.userId) {
              const { sendLinePush, bookingConfirmationFlex } = await import("@/lib/line");
              sendLinePush(
                orderData.userId, 
                [bookingConfirmationFlex(orderId, serviceName, orderData.totalPrice || 0)],
                customerToken
              ).catch(err => console.error("Customer push error in webhook:", err));
            }

            // Geo-Filtered Broadcast to matching rubbers only (LINE + In-App)
            const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
            await broadcastToEligibleRubbers(
              db, env, orderId,
              orderData.address,
              orderData.deliveryFee || 0,
              'paid',
              !!orderData.isTest
            );
          }
        } catch (e) {
          console.error("Failed to broadcast to rubbers from webhook:", e);
        }
      }
    } else {
      console.log(`Unhandled Beam event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
