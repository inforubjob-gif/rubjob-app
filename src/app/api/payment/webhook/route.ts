import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/payment/webhook
 * Handles Omise Webhook Events (e.g., charge.complete)
 */
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as any;
    const eventType = payload.key;
    const data = payload.data;

    // Access Env from Cloudflare context
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "DB binding not found" }, { status: 500 });
    }

    if (eventType === "charge.complete") {
      const orderId = data.metadata?.orderId;
      const status = data.status; // 'successful' or 'failed'

      if (orderId && status === "successful") {
        // Update Order to 'paid'
        await db.prepare(`
          UPDATE orders 
          SET paymentStatus = 'paid',
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(orderId).run();

        console.log(`Order ${orderId} marked as PAID via Webhook`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
