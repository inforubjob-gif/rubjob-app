import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

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

    // Access D1 from Cloudflare context via getRequestContext
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT o.*, s.name as serviceName, s.icon as serviceIcon
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      WHERE o.userId = ?
      ORDER BY o.createdAt DESC
    `).bind(userId).all();

    // Parse JSON strings back to objects
    const orders = results.map((row: any) => ({
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

    await db.prepare(`
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

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
