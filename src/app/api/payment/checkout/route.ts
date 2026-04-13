import { NextResponse } from "next/server";
import { createOmiseCharge } from "@/lib/payment";

export const runtime = "edge";

/**
 * POST /api/payment/checkout
 * Creates an Omise Charge (PromptPay) for an order
 */
export async function POST(req: Request) {
  try {
    const { orderId, amount, paymentMethod } = await req.json() as any;

    if (!orderId || !amount) {
      return NextResponse.json({ error: "Order ID and Amount required" }, { status: 400 });
    }

    // Access Env from Cloudflare context
    const env = (req as any).context?.env;
    const db = env?.DB;
    const secretKey = env?.OMISE_SECRET_KEY;

    if (!db || !secretKey) {
      return NextResponse.json({ error: "Missing DB or Omise Configuration" }, { status: 500 });
    }

    // 1. Create Source for PromptPay (or other methods)
    let chargeParams: any = {
      amount: Math.round(amount * 100), // Satang
      currency: "thb",
      description: `Payment for Rubjob Order ${orderId}`,
      metadata: { orderId },
    };

    if (paymentMethod === "promptpay") {
      chargeParams.source = {
        type: "promptpay"
      };
    } else if (paymentMethod === "rabbit_linepay") {
      chargeParams.source = {
        type: "rabbit_linepay"
      };
    } else {
      // Default to PromptPay for now if not specified
      chargeParams.source = { type: "promptpay" };
    }

    // 2. Create Charge in Omise
    const charge = await createOmiseCharge(chargeParams, secretKey);

    // 3. Update Order in D1 with Charge ID and Pay Details
    await db.prepare(`
      UPDATE orders 
      SET paymentStatus = 'pending', 
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(orderId).run();

    // 4. Return the source details (QR Code for PromptPay)
    return NextResponse.json({
      success: true,
      chargeId: charge.id,
      paymentData: charge.source?.scannable_code?.image?.download_uri || charge.authorize_uri,
      method: paymentMethod
    });

  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
