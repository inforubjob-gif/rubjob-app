import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/admin/orders/cron
 * Background worker to monitor AT_SHOP orders and trigger hourly alerts in Admin Dashboard
 */
export async function GET(request: Request) {
  // Simple auth check for cron (e.g., header key)
  const authHeader = request.headers.get("x-cron-key");
  if (process.env.CRON_KEY && authHeader !== process.env.CRON_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getRequestContext().env.DB;
    
    // 1. Find orders at shop for > 3 hours
    // Using SQLite strftime to compare times
    const { results: delayedOrders } = await db.prepare(`
      SELECT id, arrivedAtShopAt, lastNotifiedAt 
      FROM orders 
      WHERE status = 'at_shop' 
      AND arrivedAtShopAt IS NOT NULL
      AND (julianday('now') - julianday(arrivedAtShopAt)) * 24 > 3
    `).all();

    let updatedCount = 0;

    for (const order of delayedOrders) {
      const lastNotified = order.lastNotifiedAt ? new Date(order.lastNotifiedAt).getTime() : 0;
      const now = Date.now();
      const hoursSinceNotify = (now - lastNotified) / (1000 * 60 * 60);

      if (hoursSinceNotify >= 1) {
        // Update lastNotifiedAt to trigger a "new" alert in the dashboard
        await db.prepare("UPDATE orders SET lastNotifiedAt = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(order.id)
          .run();
        updatedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      checked: delayedOrders.length,
      notified: updatedCount 
    });
  } catch (error: any) {
    console.error("Cron SLA check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
