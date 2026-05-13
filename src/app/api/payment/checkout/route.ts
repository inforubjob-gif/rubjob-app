import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { safeError } from "@/lib/api-utils";

export const runtime = "edge";

/**
 * POST /api/payment/checkout
 * Creates a Stripe PaymentIntent for PromptPay
 */
export async function POST(req: Request) {
  try {
    const { orderId, amount } = await req.json() as any as { orderId: string, amount: number };

    if (!orderId || !amount) {
      return NextResponse.json({ error: "Order ID and Amount required" }, { status: 400 });
    }

    // Access Env from Cloudflare context
    const env = getRequestContext().env;
    const db = env?.DB;

    if (!db) {
      return NextResponse.json({ error: "Missing DB Connection" }, { status: 500 });
    }

    // 🛡️ Phase 2.1: Validate amount against actual order in DB
    const order = await db.prepare(
      "SELECT totalPrice, paymentStatus FROM orders WHERE id = ?"
    ).bind(orderId).first() as { totalPrice: number; paymentStatus: string } | null;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }
    if (Math.round(order.totalPrice * 100) !== Math.round(amount * 100)) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Try Env first, then DB
    let stripeSecretKey = env?.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'stripe_secret_key'").first() as { value: string };
      stripeSecretKey = setting?.value;
    }

    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe Secret Key not configured" }, { status: 500 });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20", // Use a stable version
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

    // 2. Self-healing: Fix any empty strings in foreign key columns to avoid SQLITE_CONSTRAINT during UPDATE
    try {
      await db.prepare(`
        UPDATE orders 
        SET storeId = NULLIF(storeId, ''),
            pickupDriverId = NULLIF(pickupDriverId, ''),
            deliveryDriverId = NULLIF(deliveryDriverId, ''),
            providerId = NULLIF(providerId, '')
        WHERE id = ? AND (storeId = '' OR pickupDriverId = '' OR deliveryDriverId = '' OR providerId = '')
      `).bind(orderId).run();
    } catch (e) {
      console.warn("Auto-healing foreign keys failed", e);
    }

    // 3. Update Order in D1 with PaymentIntent ID
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

  } catch (error: unknown) {
    console.error("Stripe Checkout error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
