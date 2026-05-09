import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { ensureSchema } from "@/lib/db-init";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Automatic Schema Healing
    await ensureSchema(db);

    // Step 1: Core Statistics (Always available tables)
    const coreStats = await db.batch([
      db.prepare("SELECT COUNT(*) as total FROM users WHERE role IS NULL OR role = 'user'"),
      db.prepare("SELECT COUNT(*) as total FROM stores"),
      db.prepare("SELECT COUNT(*) as total FROM orders WHERE status != 'cancelled'"),
      db.prepare("SELECT SUM(totalPrice) as revenue, SUM(laundryFee) as totalLaundry, SUM(deliveryFee) as totalDelivery FROM orders WHERE status = 'completed'"),
      db.prepare("SELECT key, value FROM system_settings WHERE key IN ('gp_store_percent', 'gp_rubber_percent')"),
      db.prepare("SELECT COUNT(*) as total FROM users"), // Raw Unfiltered Count
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'"), // Diagnostic
    ]);

    const usersCount = coreStats[0].results?.[0]?.total || 0;
    const storesCount = coreStats[1].results?.[0]?.total || 0;
    const ordersCount = coreStats[2].results?.[0]?.total || 0;
    const rawUsersCount = coreStats[5].results?.[0]?.total || 0;
    const tableNames = (coreStats[6].results || []).map((r: any) => r.name);

    const revResult = coreStats[3].results?.[0] || {};
    const grossRevenue = revResult.revenue || 0;
    const totalLaundry = revResult.totalLaundry || 0;
    const totalDelivery = revResult.totalDelivery || 0;

    const settings = (coreStats[4].results || []) as { key: string, value: string }[];
    const gpStoreRaw = settings.find(s => s.key === 'gp_store_percent')?.value;
    const gpRubberRaw = settings.find(s => s.key === 'gp_rubber_percent')?.value;
    const gpStore = gpStoreRaw !== undefined ? Number(gpStoreRaw) : 10;
    const gpRubber = gpRubberRaw !== undefined ? Number(gpRubberRaw) : 15;

    // Step 2: Extended Stats (Pulling from specialized tables)
    let totalRubbers = 0;
    let activeRubbers = 0;
    let activeStores = 0;

    try {
      const extended = await db.batch([
        db.prepare("SELECT COUNT(*) as total FROM rubber_users"),
        db.prepare(`SELECT COUNT(*) as total FROM rubber_users WHERE status = 'active' AND (preferences IS NULL OR json_extract(preferences, '$.workStatus') IS NULL OR json_extract(preferences, '$.workStatus') NOT IN (0, 'false', false))`),
        db.prepare(`SELECT COUNT(*) as total FROM stores WHERE status = 'active' AND (preferences IS NULL OR json_extract(preferences, '$.workStatus') IS NULL OR json_extract(preferences, '$.workStatus') NOT IN (0, 'false', false))`)
      ]);
      
      totalRubbers = extended[0].results?.[0]?.total || 0;
      activeRubbers = extended[1].results?.[0]?.total || 0;
      activeStores = extended[2].results?.[0]?.total || 0;
    } catch (e: any) {
      console.warn("Extended stats failed:", e.message);
    }

    const displayTotalStores = storesCount;

    // Calculations
    const storeEarnings = (totalLaundry * gpStore) / 100;
    const rubberEarnings = (totalDelivery * gpRubber) / 100;
    const totalPlatformEarnings = storeEarnings + rubberEarnings;

    // 2. Full Table Inventory (Count rows in every table - batched for efficiency)
    const inventory: Record<string, number> = {};
    const tableListResult = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNamesList = tableListResult.results.map((r: any) => r.name).filter((n: string) => !n.startsWith('_'));
    
    // Use db.batch() to count all tables in a single round-trip
    try {
      const countQueries = tableNamesList.map((name: string) => 
        db.prepare(`SELECT '${name}' as tbl, COUNT(*) as count FROM "${name}"`)
      );
      if (countQueries.length > 0) {
        const batchResults = await db.batch(countQueries);
        batchResults.forEach((result: any) => {
          const row = result.results?.[0];
          if (row) inventory[row.tbl] = row.count || 0;
        });
      }
    } catch (err) {
      console.warn("Batch inventory count failed, skipping:", err);
    }

    return NextResponse.json({ 
      users: usersCount,
      rawUsers: rawUsersCount,
      tables: tableNamesList,
      connection: "D1_CONNECTED",
      stores: displayTotalStores,
      activeStores: activeStores,
      orders: ordersCount,
      revenue: grossRevenue,
      earnings: totalPlatformEarnings,
      gpStore,
      gpRubber,
      totalRubbers,
      activeRubbers,
      inventory: inventory
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
