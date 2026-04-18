import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRiderSession } from "@/lib/auth-server";
import { nanoid } from "nanoid";

export const runtime = "edge";

/**
 * GET /api/rider/wallet?riderId=...
 * Fetch rider balance and transaction history
 */
export async function GET(req: Request) {
  const session = await getRiderSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const riderId = searchParams.get("riderId");
    if (!riderId) return NextResponse.json({ error: "Missing riderId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Fetch System Settings for Commissions
    const settingsRows = await db.prepare(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('gp_rider_percent', 'rider_base_payout')
    `).all();
    
    const settings: Record<string, string> = {};
    settingsRows.results.forEach((row: any) => settings[row.key] = row.value);

    const gpRiderPercent = parseFloat(settings.gp_rider_percent || "10");
    const riderBasePayout = parseFloat(settings.rider_base_payout || "0");

    // 2. Calculate Earnings (completed orders where user is pickup or delivery driver)
    const ordersRes = await db.prepare(`
      SELECT id, deliveryFee, createdAt, status,
             CASE WHEN pickupDriverId = ? THEN 1 ELSE 0 END as isPickup,
             CASE WHEN deliveryDriverId = ? THEN 1 ELSE 0 END as isDelivery
      FROM orders 
      WHERE (pickupDriverId = ? OR deliveryDriverId = ?) AND status = 'completed'
    `).bind(riderId, riderId, riderId, riderId).all();

    let totalEarnings = 0;
    const history = (ordersRes.results as any[]).map(o => {
      // If a rider did BOTH legs, they earn twice? 
      // Current design: deliveryFee is per order. 
      // For simplicity: If they did at least one leg, they get the portion.
      // Better: In real app, we might split fee. 
      // Logic: riderEarn = (deliveryFee * (1 - GP%)) + base
      const earnings = (o.deliveryFee * (100 - gpRiderPercent) / 100) + riderBasePayout;
      totalEarnings += earnings;
      return {
        id: o.id,
        type: "Delivery Earnings",
        amount: earnings,
        date: o.createdAt,
        status: "Success"
      };
    });

    // 3. Calculate Withdrawals
    const withdrawalsRes = await db.prepare(`
      SELECT SUM(amount) as totalWithdrawn 
      FROM payout_requests 
      WHERE requesterId = ? AND status != 'rejected'
    `).bind(riderId).first() as any;
    
    const totalWithdrawn = withdrawalsRes?.totalWithdrawn || 0;
    const balance = totalEarnings - totalWithdrawn;

    // 4. Fetch Payout Transactions
    const { results: payouts } = await db.prepare(`
      SELECT id, amount, createdAt, status
      FROM payout_requests 
      WHERE requesterId = ?
    `).bind(riderId).all();

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
 * POST /api/rider/wallet
 * Handle rider withdrawal request
 */
export async function POST(req: Request) {
  const session = await getRiderSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { riderId, amount, bankName, accountNumber, accountName } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const id = `WDR-R-${nanoid(8).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO payout_requests (id, requesterId, requesterType, amount, bankName, accountNumber, accountName, status)
      VALUES (?, ?, 'driver', ?, ?, ?, ?, 'pending')
    `).bind(id, riderId, amount, bankName || "N/A", accountNumber || "N/A", accountName || "N/A").run();

    return NextResponse.json({ success: true, payoutId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
