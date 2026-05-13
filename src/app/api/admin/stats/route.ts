import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

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
    } catch (e: unknown) {
      console.warn("Extended stats failed:", e instanceof Error ? e.message : String(e));
    }

    const displayTotalStores = storesCount;

    // Calculations
    const storeGP = (totalLaundry * gpStore) / 100;
    const storeNetEarnings = totalLaundry - storeGP;

    // Accurately calculate Rubber Net Earnings, GP, and Platform Fees by looking ONLY at assigned legs
    // This perfectly matches the logic in /api/admin/rubbers (each leg = 50% of the delivery pot)
    let rubberNetEarnings = 0;
    let rubberGP = 0;
    let platformFeeTotal = 0;
    try {
      const rubberStats = await db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 15) * 0.5 ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 15) * 0.5 ELSE 0 END), 0) as netEarnings,
          
          COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN (deliveryFee * ?/100) * 0.5 ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN (deliveryFee * ?/100) * 0.5 ELSE 0 END), 0) as gp,
          
          COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN 7.5 ELSE 0 END), 0) +
          COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN 7.5 ELSE 0 END), 0) as platformFee
        FROM orders WHERE status = 'completed'
      `).bind(gpRubber, gpRubber, gpRubber, gpRubber).first() as any;
      
      rubberNetEarnings = rubberStats?.netEarnings || 0;
      rubberGP = rubberStats?.gp || 0;
      platformFeeTotal = rubberStats?.platformFee || 0;
    } catch (e) {
      console.warn("True rubber earnings calc failed", e);
    }

    // Calculate Payment Gateway Fee (Stripe/Omise)
    // Credit cards ~3.65% + 10 THB, PromptPay ~1.65%. We approximate based on paymentMethod.
    let paymentGatewayFee = 0;
    try {
      const pgStats = await db.prepare(`
        SELECT SUM(
          CASE 
            WHEN paymentMethod LIKE '%card%' THEN (totalPrice * 0.0365) + 10 
            WHEN paymentMethod LIKE '%promptpay%' THEN (totalPrice * 0.0165)
            WHEN paymentMethod = 'cash' THEN 0
            ELSE (totalPrice * 0.03) -- 3% fallback for unknown digital methods
          END
        ) as fee 
        FROM orders WHERE status = 'completed'
      `).first() as any;
      paymentGatewayFee = pgStats?.fee || 0;
    } catch (e) {
      console.warn("Payment gateway fee calc failed", e);
    }

    // Unassigned delivery fees (where neither pickup nor delivery driver was assigned, or only one was assigned)
    // The platform absorbs this remaining fee as pure profit.
    const unassignedDeliveryFee = totalDelivery - (rubberNetEarnings + rubberGP + platformFeeTotal);

    // Total platform earnings = Store GP + Rubber GP + Flat Platform Fee + Unassigned Delivery Fees - Payment API Fees
    const totalPlatformEarnings = storeGP + rubberGP + platformFeeTotal + unassignedDeliveryFee - paymentGatewayFee;

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

    // 3. Wallet Balances (Aggregate for all rubbers and stores)
    let rubberWalletBalance = 0;
    let storeWalletBalance = 0;

    try {
      const walletStats = await db.batch([
        // Total rubber earnings: deliveryFee from completed orders, matching exact leg logic
        db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN pickupDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 15) * 0.5 ELSE 0 END), 0) +
            COALESCE(SUM(CASE WHEN deliveryDriverId IS NOT NULL THEN (deliveryFee - (deliveryFee * ?/100) - 15) * 0.5 ELSE 0 END), 0) as total
          FROM orders WHERE status = 'completed'
        `).bind(gpRubber, gpRubber),
        // Total rubber withdrawals (excluding rejected)
        db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM payout_requests WHERE requesterType = 'rubber' AND status != 'rejected'
        `),
        // Total store earnings: laundryFee × (100 - gpStore)% from completed orders
        db.prepare(`
          SELECT COALESCE(SUM(laundryFee * ?), 0) as total
          FROM orders WHERE status = 'completed' AND storeId IS NOT NULL
        `).bind((100 - gpStore) / 100),
        // Total store withdrawals (excluding rejected)
        db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM payout_requests WHERE requesterType = 'store' AND status != 'rejected'
        `),
      ]);

      const rubberEarned = walletStats[0].results?.[0]?.total || 0;
      const rubberWithdrawn = walletStats[1].results?.[0]?.total || 0;
      rubberWalletBalance = Math.max(0, Number(rubberEarned) - Number(rubberWithdrawn));

      const storeEarned = walletStats[2].results?.[0]?.total || 0;
      const storeWithdrawn = walletStats[3].results?.[0]?.total || 0;
      storeWalletBalance = Math.max(0, Number(storeEarned) - Number(storeWithdrawn));
    } catch (e) {
      console.warn("Wallet stats failed:", e);
    }
    // 4. Top Insights
    let topServices: any[] = [];
    let topLocations: any[] = [];
    try {
      const insights = await db.batch([
        db.prepare(`
          SELECT s.name, COUNT(o.id) as count 
          FROM orders o 
          JOIN services s ON o.serviceId = s.id 
          WHERE o.status != 'cancelled'
          GROUP BY s.id 
          ORDER BY count DESC 
          LIMIT 5
        `),
        db.prepare(`
          SELECT address, COUNT(id) as count 
          FROM orders 
          WHERE address IS NOT NULL AND address != '' AND status != 'cancelled'
          GROUP BY address 
          ORDER BY count DESC 
          LIMIT 5
        `)
      ]);
      topServices = insights[0].results || [];
      
      // Post-process addresses to extract districts or just use short versions
      const rawLocations = insights[1].results || [];
      topLocations = rawLocations.map((loc: any) => {
         // Naive extraction: try to get the part after "เขต" or "อำเภอ" if it exists, otherwise just truncate
         let shortName = loc.address;
         if (shortName.length > 30) shortName = shortName.substring(0, 30) + '...';
         return { name: shortName, count: loc.count };
      });
    } catch (e) {
      console.warn("Top insights failed:", e);
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
