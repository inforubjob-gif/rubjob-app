import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const runtime = "edge";

/**
 * GET /api/store/wallet?storeId=...
 * Fetch store balance and transaction history
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Calculate Earnings (sum of laundryFee from completed orders)
    const earningsRes = await db.prepare(`
      SELECT SUM(laundryFee) as totalEarnings 
      FROM orders 
      WHERE storeId = ? AND status = 'completed'
    `).bind(storeId).first() as any;
    
    const totalEarnings = (earningsRes?.totalEarnings || 0) * 0.85; // Applying 15% commission for now

    // 2. Calculate Withdrawals
    const withdrawalsRes = await db.prepare(`
      SELECT SUM(amount) as totalWithdrawn 
      FROM payout_requests 
      WHERE requesterId = ? AND status != 'rejected'
    `).bind(storeId).first() as any;
    
    const totalWithdrawn = withdrawalsRes?.totalWithdrawn || 0;
    const balance = totalEarnings - totalWithdrawn;

    // 3. Fetch Recent Transactions (Orders + Payouts)
    const { results: orders } = await db.prepare(`
      SELECT id, laundryFee as amount, createdAt, 'earning' as type, 'success' as status
      FROM orders 
      WHERE storeId = ? AND status = 'completed'
      ORDER BY createdAt DESC LIMIT 10
    `).bind(storeId).all();

    const { results: payouts } = await db.prepare(`
      SELECT id, amount, createdAt, 'withdrawal' as type, status
      FROM payout_requests 
      WHERE requesterId = ?
      ORDER BY createdAt DESC LIMIT 10
    `).bind(storeId).all();

    // Map and merge
    const transactions = [
      ...(orders as any[]).map(o => ({ 
        id: o.id, 
        type: "Laundry Earning", 
        amount: o.amount * 0.85, 
        date: o.createdAt, 
        status: "Success" 
      })),
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
      transactions: transactions.slice(0, 15)
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/store/wallet
 * Handle withdrawal request
 */
export async function POST(req: Request) {
  try {
    const { storeId, amount, bankName, accountNumber, accountName } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!storeId || !amount) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const id = `WDR-${nanoid(8).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO payout_requests (id, requesterId, requesterType, amount, bankName, accountNumber, accountName, status)
      VALUES (?, ?, 'store', ?, ?, ?, ?, 'pending')
    `).bind(id, storeId, amount, bankName || "N/A", accountNumber || "N/A", accountName || "N/A").run();

    return NextResponse.json({ success: true, payoutId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
