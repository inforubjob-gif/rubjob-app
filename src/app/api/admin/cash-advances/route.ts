import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { createNotification } from "@/lib/notify-server";

export const runtime = "edge";

/**
 * GET /api/admin/cash-advances
 * Fetch all cash advance records, grouped by rubber
 */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "pending";

    // Fetch all records with rubber name
    const { results: records } = await db.prepare(`
      SELECT ca.*, r.name as rubberName, r.phone as rubberPhone
      FROM cash_advances ca
      LEFT JOIN rubber_users r ON ca.rubberId = r.id
      WHERE ca.status = ?
      ORDER BY ca.createdAt DESC
      LIMIT 200
    `).bind(statusFilter).all();

    // Aggregate by rubber for summary
    const rubberMap: Record<string, { rubberId: string; rubberName: string; rubberPhone: string; totalPending: number; count: number; records: any[] }> = {};

    (records as any[]).forEach(r => {
      if (!rubberMap[r.rubberId]) {
        rubberMap[r.rubberId] = {
          rubberId: r.rubberId,
          rubberName: r.rubberName || "Unknown",
          rubberPhone: r.rubberPhone || "",
          totalPending: 0,
          count: 0,
          records: []
        };
      }
      rubberMap[r.rubberId].totalPending += r.amount;
      rubberMap[r.rubberId].count += 1;
      rubberMap[r.rubberId].records.push(r);
    });

    const grouped = Object.values(rubberMap).sort((a, b) => b.totalPending - a.totalPending);

    // Grand total
    const grandTotal = grouped.reduce((acc, g) => acc + g.totalPending, 0);
    const totalRecords = grouped.reduce((acc, g) => acc + g.count, 0);

    return NextResponse.json({ grouped, grandTotal, totalRecords });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * PUT /api/admin/cash-advances
 * Settle or reject a single cash advance record
 * Body: { id, action: 'settle' | 'reject', note? }
 */
export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, action, note } = await req.json() as any;
    if (!id || !action) return NextResponse.json({ error: "Missing id or action" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const newStatus = action === "settle" ? "settled" : "rejected";

    await db.prepare(`
      UPDATE cash_advances 
      SET status = ?, settledAt = CURRENT_TIMESTAMP, settledBy = ?, settlementNote = ?
      WHERE id = ? AND status = 'pending'
    `).bind(newStatus, session.id || "admin", note || null, id).run();

    // Notify rubber
    const record = await db.prepare("SELECT rubberId, amount, storeName FROM cash_advances WHERE id = ?").bind(id).first() as any;
    if (record?.rubberId) {
      try {
        await createNotification(db, {
          userId: record.rubberId,
          userType: "rubber",
          type: "cash_advance_settled",
          title: action === "settle" ? "✅ ได้รับเงินคืนแล้ว" : "❌ รายการถูกปฏิเสธ",
          message: action === "settle"
            ? `ได้รับเงินคืน ฿${record.amount} (ร้าน ${record.storeName}) เรียบร้อยแล้ว`
            : `รายการ ฿${record.amount} (ร้าน ${record.storeName}) ถูกปฏิเสธ${note ? ': ' + note : ''}`,
          link: "/rubber/wallet/cash-advance"
        });
      } catch (e) { console.error("Settlement notification error:", e); }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
