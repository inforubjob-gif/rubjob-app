import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const stats = await db.batch([
      db.prepare("SELECT COUNT(*) as total FROM users"),
      db.prepare("SELECT COUNT(*) as total FROM stores"),
      db.prepare("SELECT COUNT(*) as total FROM orders WHERE status != 'cancelled'"),
      db.prepare("SELECT SUM(totalPrice) as revenue FROM orders WHERE status = 'completed'"),
      db.prepare("SELECT value FROM system_settings WHERE key = 'commission_rate'")
    ]);

    const grossRevenue = stats[3].results[0].revenue || 0;
    const commissionRate = Number(stats[4].results[0]?.value) || 15;
    const earnings = (grossRevenue * commissionRate) / 100;

    return NextResponse.json({ 
      users: stats[0].results[0].total,
      stores: stats[1].results[0].total,
      orders: stats[2].results[0].total,
      revenue: grossRevenue,
      earnings: earnings,
      commissionRate: commissionRate
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
