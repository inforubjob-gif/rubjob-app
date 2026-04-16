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
      db.prepare("SELECT key, value FROM system_settings WHERE key IN ('gp_store_percent', 'gp_rider_percent')"),
      // New: Active Riders (Role = rider AND workStatus is true in preferences JSON)
      db.prepare("SELECT COUNT(*) as total FROM users WHERE role = 'rider'"),
      db.prepare(`
        SELECT COUNT(*) as total FROM users 
        WHERE role = 'rider' 
        AND (
          JSON_EXTRACT(preferences, '$.workStatus') = 1 
          OR JSON_EXTRACT(preferences, '$.workStatus') = 'true'
          OR JSON_EXTRACT(preferences, '$.workStatus') IS TRUE
        )
      `),
      // New: Active Stores (Role = store AND workStatus is true in preferences JSON)
      db.prepare("SELECT COUNT(*) as total FROM users WHERE role = 'store'"),
      db.prepare(`
        SELECT COUNT(*) as total FROM users 
        WHERE role = 'store' 
        AND (
          JSON_EXTRACT(preferences, '$.workStatus') = 1 
          OR JSON_EXTRACT(preferences, '$.workStatus') = 'true'
          OR JSON_EXTRACT(preferences, '$.workStatus') IS TRUE
        )
      `)
    ]);

    const usersCount = stats[0].results?.[0]?.total || 0;
    const storesCount = stats[1].results?.[0]?.total || 0;
    const ordersCount = stats[2].results?.[0]?.total || 0;

    const revResult = stats[3].results?.[0] || {};
    const grossRevenue = revResult.revenue || 0;
    const totalLaundry = revResult.totalLaundry || 0;
    const totalDelivery = revResult.totalDelivery || 0;

    const settings = (stats[4].results || []) as { key: string, value: string }[];
    const gpStore = Number(settings.find(s => s.key === 'gp_store_percent')?.value) || 20;
    const gpRider = Number(settings.find(s => s.key === 'gp_rider_percent')?.value) || 10;

    const totalRiders = stats[5].results?.[0]?.total || 0;
    const activeRiders = stats[6].results?.[0]?.total || 0;
    const totalStoresFromRoles = stats[7].results?.[0]?.total || 0;
    const activeStores = stats[8].results?.[0]?.total || 0;

    // Use the maximum of stores table count vs users with store role
    const displayTotalStores = Math.max(storesCount, totalStoresFromRoles);

    // The Formula:
    const storeEarnings = (totalLaundry * gpStore) / 100;
    const riderEarnings = (totalDelivery * gpRider) / 100;
    const totalPlatformEarnings = storeEarnings + riderEarnings;

    return NextResponse.json({ 
      users: usersCount,
      stores: displayTotalStores,
      activeStores: activeStores,
      orders: ordersCount,
      revenue: grossRevenue,
      earnings: totalPlatformEarnings,
      gpStore,
      gpRider,
      totalRiders,
      activeRiders
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
