import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/rider/orders?riderId=...
 * Fetches available and active orders for a rider
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const riderId = searchParams.get("riderId");

    if (!riderId) {
      return NextResponse.json({ error: "Rider ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // 1. Available Jobs: pending with no driver
    const availableJobs = await db.prepare(`
      SELECT o.*, s.name as serviceName, st.name as storeName, st.address as storeAddress
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      JOIN stores st ON o.storeId = st.id
      WHERE o.status = 'pending' AND o.pickupDriverId IS NULL
    `).all();

    // 2. Active Jobs: rider is assigned as pickup or delivery driver
    const activeJobs = await db.prepare(`
      SELECT o.*, s.name as serviceName, st.name as storeName
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      JOIN stores st ON o.storeId = st.id
      WHERE (o.pickupDriverId = ? OR o.deliveryDriverId = ?) 
      AND o.status NOT IN ('completed', 'cancelled')
    `).bind(riderId, riderId).all();

    return NextResponse.json({ 
      available: availableJobs.results.map((r: any) => ({
        ...r,
        address: JSON.parse(r.address || "{}"),
        items: JSON.parse(r.items || "[]")
      })),
      active: activeJobs.results.map((r: any) => ({
        ...r,
        address: JSON.parse(r.address || "{}"),
        items: JSON.parse(r.items || "[]")
      }))
    });
  } catch (error: any) {
    console.error("Fetch rider orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
