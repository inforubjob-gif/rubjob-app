import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const db = getRequestContext().env.DB;

    if (id) {
      const order = await db.prepare(`
        SELECT o.*, 
               u.displayName as customerName, u.phone as customerPhone, u.pictureUrl as customerPicture,
               s.name as storeName, s.phone as storePhone, s.address as storeAddress, s.lat as storeLat, s.lng as storeLng,
               r1.name as pickupRiderName, r1.phone as pickupRiderPhone,
               r2.name as deliveryRiderName, r2.phone as deliveryRiderPhone,
               sv.name as serviceName, sv.category as serviceCategory
        FROM orders o
        LEFT JOIN users u ON o.userId = u.id
        LEFT JOIN stores s ON o.storeId = s.id
        LEFT JOIN rubber_users r1 ON o.pickupDriverId = r1.id
        LEFT JOIN rubber_users r2 ON o.deliveryDriverId = r2.id
        LEFT JOIN services sv ON o.serviceId = sv.id
        WHERE o.id = ?
      `).bind(id).first();
      return NextResponse.json({ order });
    }

    // Full list with store, rider, and service info
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
      LIMIT 200
    `).all();
    
    return NextResponse.json({ orders: orders.results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
