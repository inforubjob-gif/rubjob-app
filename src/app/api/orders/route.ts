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

    // 🤖 Automation: Notify Store and Available Rubbers via LINE
    const env = getRequestContext().env;
    let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    let rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;

    // Fallback to database settings if env vars are not set
    if (!customerToken) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'").first() as any;
      if (setting?.value) customerToken = setting.value;
    }
    if (!rubberToken) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_channel_access_token_rubber'").first() as any;
      if (setting?.value) rubberToken = setting.value;
    }

    // Ultimate fallback for rubber token is customer token (though not recommended for different OAs)
    rubberToken = rubberToken || customerToken;
    
    if (rubberToken) {
      const { 
        sendLinePush, 
        rubberNewJobFlex, 
        storeOrderAlertFlex 
      } = await import("@/lib/line");

      // 1. Notify Store Owner (Using Rubber Bot)
      const storeData = await db.prepare("SELECT lineUserId FROM stores WHERE id = ?").bind(storeId).first() as any;
      if (storeData?.lineUserId) {
        await sendLinePush(storeData.lineUserId, [storeOrderAlertFlex(orderId)], rubberToken).catch(() => {});
      }

      // 2. Broadcast to Online Rubbers
      // ONLY broadcast immediately if payment method is cash.
      // If PromptPay/Card, we broadcast from the Stripe Webhook after payment succeeds.
      if (paymentMethod === 'cash') {
        const rubbers = await db.prepare(`
          SELECT lineUserId, preferences
          FROM rubber_users
          WHERE lineUserId IS NOT NULL
        `).all();

        // 15% commission + 15 THB Platform Fee
        const totalOrderEarn = deliveryFee - (deliveryFee * 0.15) - 15;
        const legEarn = totalOrderEarn * 0.5;

        for (const r of (rubbers.results as any[])) {
          try {
            const prefs = JSON.parse(r.preferences || "{}");
            if (prefs.workStatus === true) {
              await sendLinePush(r.lineUserId, [rubberNewJobFlex(orderId, 'pending', legEarn)], rubberToken).catch(() => {});
            }
          } catch (e) {}
        }
      }
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
