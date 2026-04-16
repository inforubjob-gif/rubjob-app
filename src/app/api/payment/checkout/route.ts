import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "edge";

/**
 * POST /api/payment/checkout
 * Creates a Stripe PaymentIntent for PromptPay
 */
export async function POST(req: Request) {
  try {
    const { orderId, amount } = await req.json() as { orderId: string, amount: number };

    if (!orderId || !amount) {
      return NextResponse.json({ error: "Order ID and Amount required" }, { status: 400 });
    }

    // Access Env from Cloudflare context
    const env = getRequestContext().env;
    const stripeSecretKey = env?.STRIPE_SECRET_KEY;
    const db = env?.DB;

    if (!db || !stripeSecretKey) {
      return NextResponse.json({ error: "Missing DB or Stripe Configuration" }, { status: 500 });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-01-27.acacia", // Use latest stable version compatible with Edge
      httpClient: Stripe.createFetchHttpClient(), // Required for Edge Runtime
    });

    // 1. Create PaymentIntent for PromptPay
    // Amount must be in satang (THB * 100)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "thb",
      payment_method_types: ["promptpay"],
      description: `Payment for Rubjob Order ${orderId}`,
      metadata: { orderId },
    });

    // 2. Update Order in D1 with PaymentIntent ID
    await db.prepare(`
      UPDATE orders 
      SET paymentStatus = 'pending', 
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(orderId).run();

    // 3. Return the clientSecret for the frontend to render the QR code
    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error: any) {
    console.error("Stripe Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
