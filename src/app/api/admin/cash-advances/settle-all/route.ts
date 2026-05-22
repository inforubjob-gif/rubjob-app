import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { createNotification } from "@/lib/notify-server";

export const runtime = "edge";

/**
 * POST /api/admin/cash-advances/settle-all
 * Settle all pending cash advance records for a specific rubber
 * Body: { rubberId, note? }
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rubberId, note } = await req.json() as any;
    if (!rubberId) return NextResponse.json({ error: "Missing rubberId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Get pending total before settling
    const summary = await db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM cash_advances 
      WHERE rubberId = ? AND status = 'pending'
    `).bind(rubberId).first() as any;

    if (!summary || summary.count === 0) {
      return NextResponse.json({ error: "No pending records found" }, { status: 404 });
    }

    // Settle all pending records
    await db.prepare(`
      UPDATE cash_advances 
      SET status = 'settled', settledAt = CURRENT_TIMESTAMP, settledBy = ?, settlementNote = ?
      WHERE rubberId = ? AND status = 'pending'
    `).bind(session.id || "admin", note || "Settle All", rubberId).run();

    // Notify rubber
    try {
      await createNotification(db, {
        userId: rubberId,
        userType: "rubber",
        type: "cash_advance_settled",
        title: "✅ ได้รับเงินคืนทั้งหมดแล้ว",
        message: `Admin จ่ายคืนเงินสดสำรองจ่าย ฿${summary.total.toLocaleString()} (${summary.count} รายการ) เรียบร้อยแล้ว`,
        link: "/rubber/wallet/cash-advance"
      });
    } catch (e) { console.error("Settle-all notification error:", e); }

    return NextResponse.json({ 
      success: true, 
      settledCount: summary.count, 
      settledTotal: summary.total 
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
