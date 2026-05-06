import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession } from "@/lib/auth-server";
import { nanoid } from "nanoid";

export const runtime = "edge";

/**
 * GET /api/rubber/wallet?rubberId=...
 * Fetch rubber balance and transaction history
 */
export async function GET(req: Request) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const rubberId = searchParams.get("rubberId");
    if (!rubberId) return NextResponse.json({ error: "Missing rubberId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Fetch System Settings for Commissions
    const settingsRows = await db.prepare(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('gp_rubber_percent', 'rubber_base_payout')
    `).all();
    
    const settings: Record<string, string> = {};
    settingsRows.results.forEach((row: any) => settings[row.key] = row.value);

    const gpRubberPercent = parseFloat(settings.gp_rubber_percent || "10");
    const rubberBasePayout = parseFloat(settings.rubber_base_payout || "0");

    // 2. Calculate Earnings (completed orders or orders that reached the handover point)
    const ordersRes = await db.prepare(`
      SELECT id, deliveryFee, createdAt, status,
             pickupDriverId, deliveryDriverId
      FROM orders 
      WHERE (pickupDriverId = ? OR deliveryDriverId = ?)
    `).bind(rubberId, rubberId).all();

    let totalEarnings = 0;
    const history: any[] = [];

    (ordersRes.results as any[]).forEach(o => {
      const totalOrderEarn = (o.deliveryFee * (100 - gpRubberPercent) / 100) + rubberBasePayout;
      const legEarn = totalOrderEarn * 0.5;

      // Leg 1: Pickup (Earned if status reached 'washing' or later)
      const pickupCompletedStatuses = ['washing', 'ready_for_pickup', 'delivering_to_customer', 'completed'];
      if (o.pickupDriverId === rubberId && pickupCompletedStatuses.includes(o.status)) {
        totalEarnings += legEarn;
        history.push({
          id: `${o.id}-P`,
          type: "Pickup Earnings",
          amount: legEarn,
          date: o.createdAt,
          status: "Success"
        });
      }

      // Leg 2: Delivery (Earned only if status is 'completed')
      if (o.deliveryDriverId === rubberId && o.status === 'completed') {
        totalEarnings += legEarn;
        history.push({
          id: `${o.id}-D`,
          type: "Delivery Earnings",
          amount: legEarn,
          date: o.createdAt,
          status: "Success"
        });
      }
    });

    // 3. Calculate Withdrawals
    const withdrawalsRes = await db.prepare(`
      SELECT SUM(amount) as totalWithdrawn 
      FROM payout_requests 
      WHERE requesterId = ? AND status != 'rejected'
    `).bind(rubberId).first() as any;
    
    const totalWithdrawn = withdrawalsRes?.totalWithdrawn || 0;
    const balance = totalEarnings - totalWithdrawn;

    // 4. Fetch Payout Transactions
    const { results: payouts } = await db.prepare(`
      SELECT id, amount, createdAt, status
      FROM payout_requests 
      WHERE requesterId = ?
    `).bind(rubberId).all();

    const transactions = [
      ...history,
      ...(payouts as any[]).map(p => ({ 
        id: p.id, 
        type: "Withdrawal", 
        amount: -p.amount, 
        date: p.createdAt, 
        status: p.status 
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ 
      balance: Math.max(0, balance),
      transactions: transactions.slice(0, 20)
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/rubber/wallet
 * Handle rubber withdrawal request
 */
export async function POST(req: Request) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rubberId, amount, bankName, accountNumber, accountName } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const id = `WDR-R-${nanoid(8).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO payout_requests (id, requesterId, requesterType, amount, bankName, accountNumber, accountName, status)
      VALUES (?, ?, 'rubber', ?, ?, ?, ?, 'pending')
    `).bind(id, rubberId, amount, bankName || "N/A", accountNumber || "N/A", accountName || "N/A").run();

    return NextResponse.json({ success: true, payoutId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
