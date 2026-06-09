import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * POST /api/admin/finance/payouts/remind
 * Admin manually sends a LINE reminder to a customer who hasn't submitted bank info
 * Body: { payoutId }
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const { payoutId } = await req.json() as any;
    if (!payoutId) return NextResponse.json({ error: "Missing payoutId" }, { status: 400 });

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Fetch the payout request
    const payout = await db.prepare(`
      SELECT id, requesterId, amount, notes, status FROM payout_requests WHERE id = ?
    `).bind(payoutId).first() as any;

    if (!payout) {
      return NextResponse.json({ error: "ไม่พบรายการนี้" }, { status: 404 });
    }

    if (payout.status !== 'awaiting_info') {
      return NextResponse.json({ error: "รายการนี้ไม่อยู่ในสถานะรอข้อมูล" }, { status: 400 });
    }

    // Extract orderId from notes (e.g. "Refund for Order RJ-XXXX")
    const orderIdMatch = payout.notes?.match(/(RJ-[A-Z0-9\-]+)/i);
    const orderId = orderIdMatch ? orderIdMatch[1] : payout.id;

    // Send reminder via LINE
    const { sendLinePush, refundReminderFlex } = await import("@/lib/line");
    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!accessToken) {
      return NextResponse.json({ error: "LINE access token not configured" }, { status: 500 });
    }

    await sendLinePush(payout.requesterId, [refundReminderFlex(orderId, payout.amount)], accessToken);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Send refund reminder error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
