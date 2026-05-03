import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getStoreSession } from "@/lib/auth-server";
import { transitionOrderStatus } from "@/lib/order-logic";
import { OrderStatus } from "@/types";

export const runtime = "edge";

/**
 * GET /api/staff/orders?storeId=...
 * Fetches orders for a specific store
 */
export async function GET(req: Request) {
  const session = await getStoreSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "Store ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT o.*, s.name as serviceName, s.icon as serviceIcon, s.estimatedDays, u.displayName as userName
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      JOIN users u ON o.userId = u.id
      WHERE o.storeId = ?
      ORDER BY o.createdAt DESC
    `).bind(storeId).all();

    // Parse JSON strings back to objects
    const orders = results.map((row: any) => ({
      ...row,
      items: JSON.parse(row.items || "[]"),
      address: JSON.parse(row.address || "{}")
    }));

    return NextResponse.json({ orders });
  } catch (error: any) {

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/store/orders
 * Store updates status (e.g. washing, ready_for_delivery)
 */
export async function PUT(req: Request) {
  const session = await getStoreSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { orderId, status } = await req.json() as any;

    if (!orderId || !status) {
      return NextResponse.json({ error: "Order ID and Status required" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const result = await transitionOrderStatus(
      db, 
      orderId, 
      status as OrderStatus, 
      env
    );

    if (result.success) {
      return NextResponse.json({ success: true, status: result.nextStatus });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Store status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
