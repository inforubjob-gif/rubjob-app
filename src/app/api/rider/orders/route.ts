import { getRequestContext } from "@cloudflare/next-on-pages";
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
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // Fetch Financial Settings for Calculation
    const settingsRows = await db.prepare(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('gp_rider_percent', 'rider_base_payout')
    `).all();
    
    const settings: Record<string, string> = {};
    settingsRows.results.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    const gpRiderPercent = parseFloat(settings.gp_rider_percent || "10");
    const riderBasePayout = parseFloat(settings.rider_base_payout || "0");

    const calculateRiderEarn = (deliveryFee: number) => {
      const commission = (deliveryFee * gpRiderPercent) / 100;
      return (deliveryFee - commission) + riderBasePayout;
    };

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
        riderEarn: calculateRiderEarn(r.deliveryFee || 0),
        address: JSON.parse(r.address || "{}"),
        items: JSON.parse(r.items || "[]")
      })),
      active: activeJobs.results.map((r: any) => ({
        ...r,
        riderEarn: calculateRiderEarn(r.deliveryFee || 0),
        address: JSON.parse(r.address || "{}"),
        items: JSON.parse(r.items || "[]")
      }))
    });
  } catch (error: any) {
    console.error("Fetch rider orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/rider/orders
 * Rider accepts a job
 */
export async function PUT(req: Request) {
  try {
    const { orderId, riderId } = await req.json();

    if (!orderId || !riderId) {
      return NextResponse.json({ error: "Order ID and Rider ID required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Update order: assign rider and change status
    // Only allow if order is still 'pending' and has no pickup driver
    const result = await db.prepare(`
      UPDATE orders 
      SET pickupDriverId = ?, status = 'picking_up', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending' AND pickupDriverId IS NULL
    `).bind(riderId, orderId).run();

    if (result.meta.changes > 0) {
      return NextResponse.json({ success: true, message: "Job accepted successfully" });
    } else {
      return NextResponse.json({ success: false, error: "งานนี้อาจถูกรับไปแล้วหรือสถานะเปลี่ยนไปแล้ว" }, { status: 409 });
    }
  } catch (error: any) {
    console.error("Accept job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
