import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/cron/remind-refunds
 * Automated daily cron job that sends LINE reminders to customers
 * who haven't submitted their bank info for refunds after 24 hours.
 * 
 * Can be triggered by Cloudflare Workers Cron Triggers or external cron services.
 */
export async function GET(req: Request) {
  try {
    // Optional: verify cron secret to prevent unauthorized access
    const { searchParams } = new URL(req.url);
    const cronSecret = searchParams.get("secret");
    const env = getRequestContext().env as any;
    
    if (env.CRON_SECRET && cronSecret !== env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Find all awaiting_info payout requests older than 24 hours
    const { results: stalePayouts } = await db.prepare(`
      SELECT id, requesterId, amount, notes 
      FROM payout_requests 
      WHERE status = 'awaiting_info' 
        AND createdAt < datetime('now', '-24 hours')
      ORDER BY createdAt ASC
      LIMIT 20
    `).all() as any;

    if (!stalePayouts || stalePayouts.length === 0) {
      return NextResponse.json({ success: true, reminded: 0, message: "No stale refund requests found" });
    }

    const { sendLinePush, refundReminderFlex } = await import("@/lib/line");
    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({ error: "LINE access token not configured" }, { status: 500 });
    }

    let remindedCount = 0;

    for (const payout of stalePayouts) {
      try {
        // Extract orderId from notes
        const orderIdMatch = payout.notes?.match(/(RJ-[A-Z0-9\-]+)/i);
        const orderId = orderIdMatch ? orderIdMatch[1] : payout.id;

        await sendLinePush(payout.requesterId, [refundReminderFlex(orderId, payout.amount)], accessToken);
        remindedCount++;
      } catch (err) {
        console.error(`Failed to remind customer ${payout.requesterId}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      reminded: remindedCount, 
      total: stalePayouts.length,
      message: `Sent ${remindedCount} reminder(s)` 
    });
  } catch (error: unknown) {
    console.error("Cron remind-refunds error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
