import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRiderSession } from "@/lib/auth-server";
import { transitionOrderStatus } from "@/lib/order-logic";

export const runtime = "edge";

/**
 * GET /api/rider/orders?riderId=...
 * Fetches available and active orders for a rider
 */
export async function GET(req: Request) {
  const session = await getRiderSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Self-healing: Ensure required columns exist
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN rider_number INTEGER").run(); } catch(e) {}
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN bankName TEXT").run(); } catch(e) {}
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN accountNumber TEXT").run(); } catch(e) {}
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN accountName TEXT").run(); } catch(e) {}

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

    // 0. Fetch Rider Profile status
    const riderProfile = await db.prepare("SELECT status FROM rider_users WHERE id = ?").bind(riderId).first() as any;
    const verificationStatus = riderProfile?.status || "unregistered";

    // 1. Available Jobs: 
    // - Pending pickup from user (status = 'pending')
    // - Ready for delivery from store (status = 'ready_for_pickup')
    const availableJobs = await db.prepare(`
      SELECT o.*, s.name as serviceName, st.name as storeName, st.address as storeAddress, st.lat as storeLat, st.lng as storeLng
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      JOIN stores st ON o.storeId = st.id
      WHERE (o.status = 'pending' AND o.pickupDriverId IS NULL)
         OR (o.status = 'ready_for_pickup' AND o.deliveryDriverId IS NULL)
    `).all();

    // 2. Active Jobs: rider is assigned as pickup or delivery driver
    const activeJobs = await db.prepare(`
      SELECT o.*, s.name as serviceName, st.name as storeName, st.address as storeAddress
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      JOIN stores st ON o.storeId = st.id
      WHERE (o.pickupDriverId = ? AND o.status IN ('picking_up', 'delivering_to_store'))
         OR (o.deliveryDriverId = ? AND o.status IN ('ready_for_pickup', 'delivering_to_customer'))
    `).bind(riderId, riderId).all();

    return NextResponse.json({ 
      status: verificationStatus,
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
  const session = await getRiderSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { orderId, riderId } = await req.json();

    if (!orderId || !riderId) {
      return NextResponse.json({ error: "Order ID and Rider ID required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Use transitionOrderStatus to handle update and notification
    // Fetch rider name first from rider_users
    const rider = await db.prepare("SELECT name as displayName FROM rider_users WHERE id = ?").bind(riderId).first() as any;
    
    // Attempt assignment first to ensure idempotency/concurrency safety
    const assignmentResult = await db.prepare(`
      UPDATE orders 
      SET pickupDriverId = ?
      WHERE id = ? AND status = 'pending' AND pickupDriverId IS NULL
    `).bind(riderId, orderId).run();

    if (assignmentResult.meta.changes > 0) {
      // If assignment succeeded, perform status transition and notification
      const transition = await transitionOrderStatus(
        db, 
        orderId, 
        "picking_up", 
        getRequestContext().env,
        { riderName: rider?.displayName || "Rider" }
      );
      
      return NextResponse.json({ success: true, message: "Job accepted successfully" });
    } else {
      return NextResponse.json({ success: false, error: "งานนี้อาจถูกรับไปแล้วหรือสถานะเปลี่ยนไปแล้ว" }, { status: 409 });
    }
  } catch (error: any) {
    console.error("Accept job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
