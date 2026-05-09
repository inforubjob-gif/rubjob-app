import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { notifyAdminDelayedOrder } from "@/lib/support-notify";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    const env = getRequestContext().env as any;
    
    if (!db) {
      return NextResponse.json({ error: "DB not found" }, { status: 500 });
    }

    // Ensure the column exists for tracking if we've notified already
    try {
      await db.prepare("ALTER TABLE orders ADD COLUMN adminNotifiedDelay INTEGER DEFAULT 0").run();
    } catch (e) {
      // Ignore if it already exists
    }

    // Find orders that are in "washing" status for more than 3 hours
    // and haven't been notified yet.
    // In SQLite, we can use datetime('now', '-3 hours')
    const { results: delayedOrders } = await db.prepare(`
      SELECT o.id, o.storeId, o.updatedAt, s.name as storeName 
      FROM orders o
      LEFT JOIN stores s ON o.storeId = s.id
      WHERE o.status = 'washing' 
        AND o.updatedAt < datetime('now', '-3 hours')
        AND (o.adminNotifiedDelay IS NULL OR o.adminNotifiedDelay = 0)
    `).all() as any;

    if (!delayedOrders || delayedOrders.length === 0) {
      return NextResponse.json({ success: true, message: "No delayed orders found." });
    }

    let notifiedCount = 0;
    for (const order of delayedOrders) {
      const sent = await notifyAdminDelayedOrder({
        orderId: order.id,
        storeName: order.storeName || "ไม่ระบุร้าน",
        hours: 3
      }, env);

      if (sent) {
        await db.prepare("UPDATE orders SET adminNotifiedDelay = 1 WHERE id = ?").bind(order.id).run();
        notifiedCount++;
      }
    }

    return NextResponse.json({ success: true, notifiedCount });
  } catch (error: any) {
    console.error("Cron check-delayed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
