import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    const orders = await db.prepare(`
      SELECT o.*, 
             u.displayName as customerName, u.phone as customerPhone,
             s.name as storeName, s.phone as storePhone,
             r1.name as pickupRiderName, r1.phone as pickupRiderPhone,
             r2.name as deliveryRiderName, r2.phone as deliveryRiderPhone,
             sv.name as serviceName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN stores s ON o.storeId = s.id
      LEFT JOIN rubber_users r1 ON o.pickupDriverId = r1.id
      LEFT JOIN rubber_users r2 ON o.deliveryDriverId = r2.id
      LEFT JOIN services sv ON o.serviceId = sv.id
      ORDER BY o.createdAt DESC
      LIMIT 10
    `).all();
    return NextResponse.json({ success: true, count: orders.results.length, data: orders.results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
