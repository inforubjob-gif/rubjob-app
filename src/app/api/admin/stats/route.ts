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
      db.prepare("SELECT SUM(totalPrice) as revenue, SUM(laundryFee) as totalLaundry, SUM(deliveryFee) as totalDelivery FROM orders WHERE status = 'completed'"),
      db.prepare("SELECT key, value FROM system_settings WHERE key IN ('gp_store_percent', 'gp_rider_percent')")
    ]);

    const results = stats[3].results[0];
    const grossRevenue = results.revenue || 0;
    const totalLaundry = results.totalLaundry || 0;
    const totalDelivery = results.totalDelivery || 0;

    const settings = stats[4].results as { key: string, value: string }[];
    const gpStore = Number(settings.find(s => s.key === 'gp_store_percent')?.value) || 20;
    const gpRider = Number(settings.find(s => s.key === 'gp_rider_percent')?.value) || 10;

    // The Formula:
    const storeEarnings = (totalLaundry * gpStore) / 100;
    const riderEarnings = (totalDelivery * gpRider) / 100;
    const totalPlatformEarnings = storeEarnings + riderEarnings;

    return NextResponse.json({ 
      users: stats[0].results[0].total,
      stores: stats[1].results[0].total,
      orders: stats[2].results[0].total,
      revenue: grossRevenue,
      earnings: totalPlatformEarnings,
      gpStore,
      gpRider
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
