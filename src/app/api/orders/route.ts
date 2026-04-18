import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/orders?userId=...
 * Fetches user orders from Cloudflare D1
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    let query = `
      SELECT o.*, s.name as serviceName, s.icon as serviceIcon, u.displayName as userDisplayName
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      LEFT JOIN users u ON o.userId = u.id
    `;
    
    let rawResults;
    if (userId === "all") {
      const { results } = await db.prepare(`${query} ORDER BY o.createdAt DESC`).all();
      rawResults = results;
    } else {
      const { results } = await db.prepare(`${query} WHERE o.userId = ? ORDER BY o.createdAt DESC`).bind(userId).all();
      rawResults = results;
    }

    // Parse JSON strings back to objects
    const orders = (rawResults || []).map((row: any) => ({
      ...row,
      items: JSON.parse(row.items || "[]"),
      address: JSON.parse(row.address || "{}")
    }));

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/orders
 * Creates a new order
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as any;
    const { 
      userId, 
      storeId, 
      serviceId, 
      items, 
      address, 
      totalPrice, 
      deliveryFee, 
      laundryFee,
      paymentMethod,
      scheduledDate
    } = body;

    if (!userId || !serviceId || !totalPrice) {
      return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const orderId = `RJ-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const result = await db.prepare(`
      INSERT INTO orders (
        id, userId, storeId, serviceId, status, 
        laundryFee, deliveryFee, totalPrice, 
        paymentMethod, paymentStatus, items, address, 
        scheduledDate, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      orderId, 
      userId, 
      storeId, 
      serviceId, 
      laundryFee || 0, 
      deliveryFee || 0, 
      totalPrice, 
      paymentMethod || 'cash', 
      JSON.stringify(items || []), 
      JSON.stringify(address || {}), 
      scheduledDate || null
    ).run();

    // 🤖 Automation: Notify Store and Available Riders via LINE
    const env = getRequestContext().env;
    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (accessToken) {
      const { 
        sendLinePush, 
        riderNewJobFlex, 
        storeOrderAlertFlex 
      } = await import("@/lib/line");

      // 1. Notify Store Owner
      const storeData = await db.prepare("SELECT lineUserId FROM stores WHERE id = ?").bind(storeId).first() as any;
      if (storeData?.lineUserId) {
        await sendLinePush(storeData.lineUserId, [storeOrderAlertFlex(orderId)], accessToken).catch(() => {});
      }

      // 2. Broadcast to Online Riders
      // We look for riders who have linked LINE and have workStatus = true in preferences
      const riders = await db.prepare(`
        SELECT ru.lineUserId, u.preferences
        FROM rider_users ru
        JOIN users u ON ru.id = u.id
        WHERE ru.lineUserId IS NOT NULL
      `).all();

      // Fetch System Settings for Earnings Calculation
      const settingsRows = await db.prepare(`
        SELECT key, value FROM system_settings WHERE key IN ('gp_rider_percent', 'rider_base_payout')
      `).all();
      const settings: any = {};
      settingsRows.results.forEach((r: any) => settings[r.key] = r.value);
      
      const gpRiderPercent = parseFloat(settings.gp_rider_percent || "10");
      const riderBasePayout = parseFloat(settings.rider_base_payout || "0");
      const commission = (deliveryFee * gpRiderPercent) / 100;
      const legEarn = ((deliveryFee - commission) + riderBasePayout) * 0.5;

      for (const r of (riders.results as any[])) {
        try {
          const prefs = JSON.parse(r.preferences || "{}");
          if (prefs.workStatus === true) {
            await sendLinePush(r.lineUserId, [riderNewJobFlex(orderId, 'pending', legEarn)], accessToken).catch(() => {});
          }
        } catch (e) {}
      }
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
