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

    // Single batch for ALL core stats — minimizes CPU time
    const results = await db.batch([
      db.prepare("SELECT COUNT(*) as total FROM users WHERE role IS NULL OR role = 'user'"),
      db.prepare("SELECT COUNT(*) as total FROM stores"),
      db.prepare("SELECT COUNT(*) as total FROM orders WHERE status != 'cancelled'"),
      db.prepare("SELECT SUM(totalPrice) as revenue, SUM(laundryFee) as totalLaundry, SUM(deliveryFee) as totalDelivery FROM orders WHERE status = 'completed'"),
      db.prepare("SELECT key, value FROM system_settings WHERE key IN ('gp_store_percent', 'gp_rubber_percent')"),
      db.prepare("SELECT COUNT(*) as total FROM rubber_users"),
      db.prepare("SELECT COUNT(*) as total FROM rubber_users WHERE status = 'active'"),
      db.prepare("SELECT COUNT(*) as total FROM stores WHERE status = 'active'"),
    ]);

    const usersCount = results[0].results?.[0]?.total || 0;
    const storesCount = results[1].results?.[0]?.total || 0;
    const ordersCount = results[2].results?.[0]?.total || 0;
    const totalRubbers = results[5].results?.[0]?.total || 0;
    const activeRubbers = results[6].results?.[0]?.total || 0;
    const activeStores = results[7].results?.[0]?.total || 0;

    const revResult = results[3].results?.[0] || {};
    const grossRevenue = revResult.revenue || 0;
    const totalLaundry = revResult.totalLaundry || 0;
    const totalDelivery = revResult.totalDelivery || 0;

    const settings = (results[4].results || []) as { key: string, value: string }[];
    const gpStore = Number(settings.find(s => s.key === 'gp_store_percent')?.value ?? 10);
    const gpRubber = Number(settings.find(s => s.key === 'gp_rubber_percent')?.value ?? 15);

    // Calculations (in-memory, no extra queries)
    const storeGP = (totalLaundry * gpStore) / 100;
    const storeNetEarnings = totalLaundry - storeGP;
    const rubberGP = (totalDelivery * gpRubber) / 100;
    const platformFeeTotal = 0; // Simplified
    const rubberNetEarnings = totalDelivery - rubberGP;
    const totalPlatformEarnings = storeGP + rubberGP;

    return NextResponse.json({ 
      users: usersCount,
      stores: storesCount,
      activeStores,
      orders: ordersCount,
      revenue: grossRevenue,
      earnings: totalPlatformEarnings,
      revenueBreakdown: {
        totalLaundry,
        totalDelivery,
        storeGP,
        rubberGP,
        platformFee: platformFeeTotal,
        storeNetEarnings,
        rubberNetEarnings,
        unassignedDeliveryFee: 0,
        paymentGatewayFee: 0,
      },
      gpStore,
      gpRubber,
      totalRubbers,
      activeRubbers,
      rubberWalletBalance: 0,
      storeWalletBalance: 0,
      topServices: [],
      topLocations: [],
      connection: "D1_CONNECTED",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
