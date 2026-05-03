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
  const stripeSecretKey = env?.STRIPE_SECRET_KEY;
  const webhookSecret = env?.STRIPE_WEBHOOK_SECRET;

  if (!db || !stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: "Missing Server Configuration" }, { status: 500 });
  }

  // Initialize Stripe
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-03-25.dahlia",
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
