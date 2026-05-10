import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "edge";

/**
 * POST /api/payment/webhook
 * Handles Stripe Webhook Events
 */
export async function POST(req: Request) {
  const env = getRequestContext().env;
  const db = env?.DB;

  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  // Try Env first, then DB
  let stripeSecretKey = env?.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'stripe_secret_key'").first() as { value: string };
    stripeSecretKey = setting?.value;
  }

  let webhookSecret = env?.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'stripe_webhook_secret'").first() as { value: string };
    webhookSecret = setting?.value;
  }

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe Server Configuration" }, { status: 500 });
  }

  // Initialize Stripe
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          // Update Order Status in D1
          await db.prepare(`
            UPDATE orders 
            SET paymentStatus = 'paid', 
                updatedAt = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).bind(orderId).run();

          console.log(`✅ Order ${orderId} marked as PAID via Stripe Webhook`);

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

              // LINE Push to Customer
              let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
              if (!customerToken) {
                const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'").first() as any;
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
                'pending'
              );
            }
          } catch (e) {
            console.error("Failed to broadcast to rubbers from webhook:", e);
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
