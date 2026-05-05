import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getProviderSession } from "@/lib/auth-server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * GET /api/provider/wallet?providerId=xxx
 * Returns provider balance and transaction history
 */
export async function GET(req: Request) {
  try {
    const token = await getProviderSession();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: ensure table exists
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS provider_wallet (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          providerId TEXT NOT NULL,
          orderId TEXT,
          amount REAL NOT NULL DEFAULT 0,
          type TEXT DEFAULT 'job_completion',
          status TEXT DEFAULT 'completed',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (e) {}

    // Calculate Earnings (sum of totalPrice from completed orders)
    const earningsRes = await db.prepare(`
      SELECT SUM(totalPrice) as totalEarnings 
      FROM orders 
      WHERE providerId = ? AND status = 'completed'
    `).bind(token).first() as any;
    
    // Applying 15% commission for now
    const totalEarnings = (earningsRes?.totalEarnings || 0) * 0.85; 

    // Calculate Withdrawals
    const withdrawalsRes = await db.prepare(`
      SELECT SUM(amount) as totalWithdrawn 
      FROM payout_requests 
      WHERE requesterId = ? AND status != 'rejected'
    `).bind(token).first() as any;
    
    const totalWithdrawn = withdrawalsRes?.totalWithdrawn || 0;
    const balance = totalEarnings - totalWithdrawn;

    // Fetch Recent Transactions (Orders + Payouts)
    const { results: orders } = await db.prepare(`
      SELECT id, totalPrice as amount, createdAt, 'earning' as type, 'success' as status
      FROM orders 
      WHERE providerId = ? AND status = 'completed'
      ORDER BY createdAt DESC LIMIT 10
    `).bind(token).all();

    const { results: payouts } = await db.prepare(`
      SELECT id, amount, createdAt, 'withdrawal' as type, status
      FROM payout_requests 
      WHERE requesterId = ?
      ORDER BY createdAt DESC LIMIT 10
    `).bind(token).all();

    // Map and merge
    const transactions = [
      ...(orders as any[]).map(o => ({ 
        id: o.id, 
        type: "Service Earning", 
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
  } catch (err: any) {
    console.error("Provider wallet GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/provider/wallet — Withdraw request
 */
export async function POST(req: Request) {
  try {
    const token = await getProviderSession();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { amount } = await req.json() as any;
    if (!amount || amount < 100) {
      return NextResponse.json({ error: "ยอดถอนขั้นต่ำ 100 บาท" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Check total earnings from orders and current balance
    const earningsRes = await db.prepare(`
      SELECT SUM(totalPrice) as totalEarnings 
      FROM orders 
      WHERE providerId = ? AND status = 'completed'
    `).bind(token).first() as any;
    
    // Applying 15% platform commission
    const totalEarnings = (earningsRes?.totalEarnings || 0) * 0.85; 

    const withdrawalsRes = await db.prepare(`
      SELECT SUM(amount) as totalWithdrawn 
      FROM payout_requests 
      WHERE requesterId = ? AND status != 'rejected'
    `).bind(token).first() as any;
    
    const totalWithdrawn = withdrawalsRes?.totalWithdrawn || 0;
    const balance = totalEarnings - totalWithdrawn;

    if (balance < amount) {
      return NextResponse.json({ error: "ยอดเงินไม่เพียงพอ" }, { status: 400 });
    }

    const { bankName, accountNumber, accountName } = await req.json() as any || {};
    const payoutId = `WDR-${nanoid(8).toUpperCase()}`;

    // Insert into unified payout_requests
    await db.prepare(`
      INSERT INTO payout_requests (id, requesterId, requesterType, amount, bankName, accountNumber, accountName, status)
      VALUES (?, ?, 'provider', ?, ?, ?, ?, 'pending')
    `).bind(
      payoutId, token, amount, 
      bankName || "N/A", accountNumber || "N/A", accountName || "N/A"
    ).run();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Provider wallet POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
