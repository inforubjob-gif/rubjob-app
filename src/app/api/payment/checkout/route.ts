import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { safeError } from "@/lib/api-utils";

export const runtime = "edge";

const BEAM_API_URL = "https://api.beamcheckout.com";

/**
 * POST /api/payment/checkout
 * Creates a Beam Charge for PromptPay QR
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

    // 🛡️ Validate amount against actual order in DB
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

    // Get Beam credentials: try Env first, then DB
    let merchantId = env?.BEAM_MERCHANT_ID;
    if (!merchantId) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'beam_merchant_id'").first() as { value: string };
      merchantId = setting?.value;
    }

    let apiKey = env?.BEAM_API_KEY;
    if (!apiKey) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'beam_api_key'").first() as { value: string };
      apiKey = setting?.value;
    }

    if (!merchantId || !apiKey) {
      return NextResponse.json({ error: "Beam credentials not configured" }, { status: 500 });
    }

    // Beam uses HTTP Basic Auth: Base64(merchantId:apiKey)
    const authHeader = btoa(`${merchantId}:${apiKey}`);

    // ═══ ป้องกันจ่ายเงินซ้ำ: ยกเลิก charge เก่าก่อนสร้างใหม่ ═══
    try {
      const prevCharge = await db.prepare(
        "SELECT chargeId FROM payment_logs WHERE orderId = ? AND gateway = 'beam' AND status = 'pending' ORDER BY createdAt DESC LIMIT 1"
      ).bind(orderId).first() as { chargeId: string } | null;

      if (prevCharge?.chargeId) {
        const voidRes = await fetch(`${BEAM_API_URL}/api/v1/charges/${prevCharge.chargeId}/void`, {
          method: "POST",
          headers: { "Authorization": `Basic ${authHeader}`, "Content-Type": "application/json" }
        });
        console.log(`🚫 Voided previous charge ${prevCharge.chargeId} for order ${orderId}: ${voidRes.status}`);
        
        // Mark old charge as voided in payment_logs
        await db.prepare(
          "UPDATE payment_logs SET status = 'voided' WHERE chargeId = ? AND status = 'pending'"
        ).bind(prevCharge.chargeId).run();
      }
    } catch (e) {
      console.warn("Void previous charge failed (non-critical):", e);
    }

    // Create Beam Charge for PromptPay
    // Amount must be in satang (THB * 100)
    const chargeBody = {
      amount: Math.round(amount * 100),
      currency: "THB",
      paymentMethod: {
        paymentMethodType: "QR_PROMPT_PAY",
        qrPromptPay: {}
      },
      referenceId: orderId
    };

    console.log("Beam request body:", JSON.stringify(chargeBody));

    const beamResponse = await fetch(`${BEAM_API_URL}/api/v1/charges`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chargeBody),
    });

    if (!beamResponse.ok) {
      const errBody = await beamResponse.text();
      console.error("Beam API error:", beamResponse.status, errBody);
      return NextResponse.json({ error: `BEAM API ERROR: ${beamResponse.status} — ${errBody.slice(0, 200)}` }, { status: 500 });
    }

    const beamData = await beamResponse.json() as any;

    // Beam response structure (confirmed from live API):
    // {
    //   chargeId: "ch_...",
    //   actionRequired: "ENCODED_IMAGE",
    //   encodedImage: {
    //     imageBase64Encoded: "iVBORw0KGgo...",  ← base64 PNG QR image
    //     rawData: "00020101021...",               ← EMVCo PromptPay payload
    //     expiry: "2026-..."
    //   }
    // }

    // Extract the base64 QR image from Beam response
    const qrCodeData = beamData.encodedImage?.imageBase64Encoded || null;
    const chargeId = beamData.chargeId || beamData.id || "";

    if (!qrCodeData) {
      console.error("No QR data in Beam response:", JSON.stringify(beamData));
      return NextResponse.json({ 
        error: "Beam returned no QR image",
        _debug: beamData,
      }, { status: 500 });
    }

    // Self-healing: Fix any empty strings in foreign key columns
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

    // Update Order with Beam Charge ID
    await db.prepare(`
      UPDATE orders 
      SET paymentStatus = 'pending', 
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(orderId).run();

    // 📒 Log payment attempt
    try {
      const { nanoid } = await import("nanoid");
      await db.prepare(`INSERT INTO payment_logs (id, orderId, gateway, chargeId, amount, status, webhookEvent) VALUES (?, ?, 'beam', ?, ?, 'pending', 'charge_created')`)
        .bind(`PAY-${nanoid(8)}`, orderId, chargeId, amount).run();
    } catch (e) { console.error("Payment log error:", e); }

    // Return QR code data for the frontend
    return NextResponse.json({
      success: true,
      chargeId,
      qrCodeData,
    });

  } catch (error: unknown) {
    console.error("Beam Checkout error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
