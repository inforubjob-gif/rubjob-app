import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/orders/[id]
 * Fetches a single order detail from Cloudflare D1
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const order = await db.prepare(`
      SELECT o.*, 
             s.name as serviceName, s.icon as serviceIcon, s.estimatedDays,
             u_customer.displayName as userName,
             st.name as storeName, st.lat as storeLat, st.lng as storeLng,
             COALESCE(r_pickup.name, u_pickup.displayName) as pickupDriverName,
             COALESCE(r_delivery.name, u_delivery.displayName) as deliveryDriverName
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      JOIN users u_customer ON o.userId = u_customer.id
      JOIN stores st ON o.storeId = st.id
      LEFT JOIN users u_pickup ON o.pickupDriverId = u_pickup.id
      LEFT JOIN rubber_users r_pickup ON o.pickupDriverId = r_pickup.id
      LEFT JOIN users u_delivery ON o.deliveryDriverId = u_delivery.id
      LEFT JOIN rubber_users r_delivery ON o.deliveryDriverId = r_delivery.id
      WHERE o.id = ?
    `).bind(id).first() as any;
 
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
 
    // Parse JSON fields defensively
    try {
      if (typeof order.items === "string" && order.items.trim()) {
        order.items = JSON.parse(order.items);
      } else if (!order.items) {
        order.items = [];
      }
    } catch (e) { order.items = []; }
 
    try {
      if (typeof order.address === "string" && order.address.trim()) {
        order.address = JSON.parse(order.address);
      } else if (typeof order.address !== "object") {
        order.address = { label: "N/A" };
      }
    } catch (e) { order.address = { label: "N/A" }; }
 
    try {
      if (typeof order.paymentInfo === "string" && order.paymentInfo.trim()) {
        order.paymentInfo = JSON.parse(order.paymentInfo);
      }
    } catch (e) { /* leave as is */ }
 
    // Fetch Financial Settings for Calculation
    const settingsRows = await db.prepare(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('gp_rubber_percent', 'rubber_base_payout')
    `).all();
    
    const settings: Record<string, string> = {};
    settingsRows.results.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    const gpRubberPercent = parseFloat(settings.gp_rubber_percent || "10");
    const rubberBasePayout = parseFloat(settings.rubber_base_payout || "0");

    const deliveryFee = order.deliveryFee || 0;
    const totalRubberPayout = (deliveryFee * (100 - gpRubberPercent) / 100) + rubberBasePayout;
    
    order.rubberEarn = totalRubberPayout; // Legacy field for backwards compatibility
    order.rubberPickupEarn = totalRubberPayout * 0.5;
    order.rubberDeliveryEarn = totalRubberPayout * 0.5;

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Fetch order detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
