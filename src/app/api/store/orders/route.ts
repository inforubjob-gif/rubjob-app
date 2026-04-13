import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/staff/orders?storeId=...
 * Fetches orders for a specific store
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "Store ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = (req as any).context?.env?.DB;
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
