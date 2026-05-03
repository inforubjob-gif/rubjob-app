import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * GET /api/provider/wallet?providerId=xxx
 * Returns provider balance and transaction history
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("provider_token")?.value;
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

    // Calculate balance
    const balRes = await db.prepare(`
      SELECT COALESCE(SUM(CASE 
        WHEN type = 'job_completion' AND status = 'completed' THEN amount 
        WHEN type = 'withdrawal' AND status = 'completed' THEN -amount 
        ELSE 0 END), 0) as balance
      FROM provider_wallet WHERE providerId = ?
    `).bind(token).first() as any;

    // Transaction history
    const histRes = await db.prepare(`
      SELECT * FROM provider_wallet 
      WHERE providerId = ? 
      ORDER BY createdAt DESC 
      LIMIT 50
    `).bind(token).all();

    return NextResponse.json({
      balance: balRes?.balance || 0,
      transactions: histRes.results || [],
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
    const cookieStore = await cookies();
    const token = cookieStore.get("provider_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { amount } = await req.json() as any;
    if (!amount || amount < 100) {
      return NextResponse.json({ error: "ยอดถอนขั้นต่ำ 100 บาท" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Check balance
    const balRes = await db.prepare(`
      SELECT COALESCE(SUM(CASE 
        WHEN type = 'job_completion' AND status = 'completed' THEN amount 
        WHEN type = 'withdrawal' AND status = 'completed' THEN -amount 
        ELSE 0 END), 0) as balance
      FROM provider_wallet WHERE providerId = ?
    `).bind(token).first() as any;

    if ((balRes?.balance || 0) < amount) {
      return NextResponse.json({ error: "ยอดเงินไม่เพียงพอ" }, { status: 400 });
    }

    await db.prepare(`
      INSERT INTO provider_wallet (providerId, amount, type, status, createdAt)
      VALUES (?, ?, 'withdrawal', 'pending', CURRENT_TIMESTAMP)
    `).bind(token, amount).run();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Provider wallet POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
