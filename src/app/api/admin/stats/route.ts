import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { reverseGeocode } from "@/lib/longdo-map";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // ─── BATCH 1: Core + Extended Stats (single round-trip) ───
    const coreStats = await db.batch([
      // [0] Users count (filtered)
      db.prepare("SELECT COUNT(*) as total FROM users WHERE role IS NULL OR role = 'user'"),
      // [1] Total stores
      db.prepare("SELECT COUNT(*) as total FROM stores"),
      // [2] Orders count
      db.prepare("SELECT COUNT(*) as total FROM orders WHERE status != 'cancelled'"),
      // [3] Revenue aggregates
      db.prepare("SELECT SUM(totalPrice) as revenue, SUM(laundryFee) as totalLaundry, SUM(deliveryFee) as totalDelivery FROM orders WHERE status = 'completed' AND status != 'cancelled'"),
      // [4] GP settings
      db.prepare("SELECT key, value FROM system_settings WHERE key IN ('gp_store_percent', 'gp_rubber_percent')"),
      // [5] Raw users count
      db.prepare("SELECT COUNT(*) as total FROM users"),
      // [6] Table names (for inventory)
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'"),
      // [7] Total rubbers
      db.prepare("SELECT COUNT(*) as total FROM rubber_users"),
      // [8] Active rubbers
      db.prepare("SELECT COUNT(*) as total FROM rubber_users WHERE status = 'active'"),
      // [9] Active stores
      db.prepare("SELECT COUNT(*) as total FROM stores WHERE status = 'active'"),
    ]);

    const usersCount = coreStats[0].results?.[0]?.total || 0;
    const storesCount = coreStats[1].results?.[0]?.total || 0;
    const ordersCount = coreStats[2].results?.[0]?.total || 0;
    const rawUsersCount = coreStats[5].results?.[0]?.total || 0;
    const tableNames = (coreStats[6].results || []).map((r: any) => r.name);
    const totalRubbers = coreStats[7].results?.[0]?.total || 0;
    const activeRubbers = coreStats[8].results?.[0]?.total || 0;
    const activeStores = coreStats[9].results?.[0]?.total || 0;

    const revResult = coreStats[3].results?.[0] || {} as any;
    const grossRevenue = revResult.revenue || 0;
    const totalLaundry = revResult.totalLaundry || 0;
    const totalDelivery = revResult.totalDelivery || 0;

    const settings = (coreStats[4].results || []) as { key: string, value: string }[];
    const gpStoreRaw = settings.find(s => s.key === 'gp_store_percent')?.value;
    const gpRubberRaw = settings.find(s => s.key === 'gp_rubber_percent')?.value;
    const gpStore = gpStoreRaw !== undefined ? Number(gpStoreRaw) : 10;
    const gpRubber = gpRubberRaw !== undefined ? Number(gpRubberRaw) : 15;

    const displayTotalStores = storesCount;

    // Calculations
    const storeGP = (totalLaundry * gpStore) / 100;
    const storeNetEarnings = totalLaundry - storeGP;

    // ─── BATCH 2: Financial Deep-Dive (rubber earnings, payment fees, wallets, insights) ───
    let rubberNetEarnings = 0;
    let rubberGP = 0;
    let platformFeeTotal = 0;
    let paymentGatewayFee = 0;
    let rubberWalletBalance = 0;
    let storeWalletBalance = 0;
    let topServices: any[] = [];
    let topLocations: any[] = [];

    try {
      const financialBatch = await db.batch([
        // [0] Rubber earnings breakdown (net, GP, platform fee)
        db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 10) * 0.5 ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 10) * 0.5 ELSE 0 END), 0) as netEarnings,
            
            COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN (deliveryFee * ?/100) * 0.5 ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN (deliveryFee * ?/100) * 0.5 ELSE 0 END), 0) as gp,
            
            COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN 5 ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN 5 ELSE 0 END), 0) as platformFee
          FROM orders WHERE status = 'completed' AND status != 'cancelled'
        `).bind(gpRubber, gpRubber, gpRubber, gpRubber),

        // [1] Payment gateway fee estimation
        db.prepare(`
          SELECT COALESCE(SUM(
            CASE 
              WHEN paymentMethod LIKE '%card%' THEN (totalPrice * 0.0365) + 10 
              WHEN paymentMethod LIKE '%promptpay%' THEN (totalPrice * 0.0165)
              WHEN paymentMethod = 'cash' OR paymentMethod = 'wallet' THEN 0
              ELSE (totalPrice * 0.03)
            END
          ), 0) as fee 
          FROM orders WHERE status = 'completed' AND status != 'cancelled'
        `),

        // [2] Rubber total earnings (for wallet)
        db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 10) * 0.5 ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 10) * 0.5 ELSE 0 END), 0) as total
          FROM orders WHERE status = 'completed' AND status != 'cancelled'
        `).bind(gpRubber, gpRubber),

        // [3] Rubber withdrawals
        db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM payout_requests WHERE requesterType = 'rubber' AND status != 'rejected'
        `),

        // [4] Store earnings (for wallet)
        db.prepare(`
          SELECT COALESCE(SUM(laundryFee * ?), 0) as total
          FROM orders WHERE status = 'completed' AND status != 'cancelled' AND storeId IS NOT NULL
        `).bind((100 - gpStore) / 100),

        // [5] Store withdrawals
        db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM payout_requests WHERE requesterType = 'store' AND status != 'rejected'
        `),

        // [6] Top services
        db.prepare(`
          SELECT s.name, COUNT(o.id) as count 
          FROM orders o 
          JOIN services s ON o.serviceId = s.id 
          WHERE o.status != 'cancelled'
          GROUP BY s.id 
          ORDER BY count DESC 
          LIMIT 5
        `),

        // [7] Top locations
        db.prepare(`
          SELECT address, COUNT(id) as count 
          FROM orders 
          WHERE address IS NOT NULL AND address != '' AND status != 'cancelled'
          GROUP BY address 
          ORDER BY count DESC 
          LIMIT 5
        `),
      ]);

      // Rubber earnings breakdown
      const rubberStats = financialBatch[0].results?.[0] as any;
      rubberNetEarnings = rubberStats?.netEarnings || 0;
      rubberGP = rubberStats?.gp || 0;
      platformFeeTotal = rubberStats?.platformFee || 0;

      // Payment gateway fee
      paymentGatewayFee = (financialBatch[1].results?.[0] as any)?.fee || 0;

      // Wallet balances
      const rubberEarned = (financialBatch[2].results?.[0] as any)?.total || 0;
      const rubberWithdrawn = (financialBatch[3].results?.[0] as any)?.total || 0;
      rubberWalletBalance = Math.max(0, Number(rubberEarned) - Number(rubberWithdrawn));

      const storeEarned = (financialBatch[4].results?.[0] as any)?.total || 0;
      const storeWithdrawn = (financialBatch[5].results?.[0] as any)?.total || 0;
      storeWalletBalance = Math.max(0, Number(storeEarned) - Number(storeWithdrawn));

      // Top insights
      topServices = financialBatch[6].results || [];

      const rawLocations = financialBatch[7].results || [];
      
      // Parse JSON address fields and aggregate by area name
      const areaCounter = new Map<string, number>();
      
      for (const loc of rawLocations as any[]) {
        let areaName = "ไม่ระบุ";
        try {
          const addr = typeof loc.address === 'string' ? JSON.parse(loc.address) : loc.address;
          
          if (addr?.lat && addr?.lng) {
            // Round lat/lng to ~1km grid for grouping nearby addresses
            const gridLat = Math.round(addr.lat * 100) / 100;
            const gridLng = Math.round(addr.lng * 100) / 100;
            // Use label + grid as area key
            areaName = addr.label || addr.details?.split(' ').slice(0, 3).join(' ') || `${gridLat}, ${gridLng}`;
          } else if (addr?.label) {
            areaName = addr.label;
          } else if (addr?.details) {
            areaName = addr.details.split(' ').slice(0, 4).join(' ');
          }
        } catch {
          // Not JSON — use raw truncated
          areaName = String(loc.address || "ไม่ระบุ").substring(0, 30);
        }
        areaCounter.set(areaName, (areaCounter.get(areaName) || 0) + loc.count);
      }
      
      topLocations = Array.from(areaCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      
      // Reverse geocode top locations using Longdo Map (or Nominatim fallback)
      try {
        const longdoKey = (env as any).LONGDO_MAP_KEY || "";
        const geocodePromises = (financialBatch[7].results || []).slice(0, 5).map(async (loc: any) => {
          try {
            const addr = typeof loc.address === 'string' ? JSON.parse(loc.address) : loc.address;
            if (!addr?.lat || !addr?.lng) return null;
            
            const geo = await reverseGeocode(addr.lat, addr.lng, longdoKey);
            return geo ? { name: geo.areaName, count: loc.count } : null;
          } catch { return null; }
        });
        
        const geocoded = (await Promise.all(geocodePromises)).filter(Boolean);
        if (geocoded.length > 0) {
          // Merge geocoded results by area name
          const geoCounter = new Map<string, number>();
          for (const g of geocoded as any[]) {
            geoCounter.set(g.name, (geoCounter.get(g.name) || 0) + g.count);
          }
          topLocations = Array.from(geoCounter.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
        }
      } catch {
        // Geocoding failed — keep parsed label fallback
      }
    } catch (e) {
      console.warn("Financial batch failed (non-fatal):", e);
    }

    // ─── Laundry Margin (ส่วนต่าง ราคาแอป - ต้นทุน) ───
    let laundryMargin = 0;
    try {
      // Sum margin per completed order: for each order, find matching cost matrix entry
      // Simple approach: average margin per store × orders per store
      const marginResult = await db.prepare(`
        SELECT COALESCE(SUM(
          CASE WHEN swc.priceExtra > 0 AND swc.priceStandard > 0 
            THEN (swc.priceExtra - swc.priceStandard) 
            ELSE 0 END
        ), 0) as totalMarginPerSize,
        COUNT(*) as entryCount
        FROM store_washer_costs swc
        JOIN stores s ON swc.storeId = s.id
        WHERE s.status = 'active'
      `).first() as any;

      const avgMarginPerSize = marginResult?.entryCount > 0 
        ? (marginResult?.totalMarginPerSize || 0) / marginResult.entryCount 
        : 0;

      // Estimate: average margin × completed orders
      const completedOrders = Number(ordersCount) || 0;
      laundryMargin = Math.round(avgMarginPerSize * completedOrders);
    } catch (e) {
      console.warn("Laundry margin calc failed:", e);
    }

    // Derived calculations
    const unassignedDeliveryFee = totalDelivery - (rubberNetEarnings + rubberGP + platformFeeTotal);
    const totalPlatformEarnings = storeGP + rubberGP + platformFeeTotal + unassignedDeliveryFee + laundryMargin - paymentGatewayFee;

    // ─── BATCH 3: Table Inventory (dynamic count per table) ───
    const inventory: Record<string, number> = {};
    const tableNamesList = tableNames.filter((n: string) => !n.startsWith('_'));

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
      // Revenue breakdown
      revenueBreakdown: {
        totalLaundry,
        totalDelivery,
        storeGP,
        rubberGP,
        platformFee: platformFeeTotal,
        storeNetEarnings,
        rubberNetEarnings,
        unassignedDeliveryFee,
        paymentGatewayFee,
        laundryMargin,
      },
      gpStore,
      gpRubber,
      totalRubbers,
      activeRubbers,
      inventory: inventory,
      rubberWalletBalance,
      storeWalletBalance,
      topServices,
      topLocations,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
