import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession } from "@/lib/auth-server";
import { transitionOrderStatus } from "@/lib/order-logic";
import { safeError } from "@/lib/api-utils";

export const runtime = "edge";

/**
 * GET /api/rubber/orders?rubberId=...
 * Fetches available and active orders for a rubber
 */
export async function GET(req: Request) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const rubberId = searchParams.get("rubberId");

    if (!rubberId) {
      return NextResponse.json({ error: "Rubber ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // Self-healing columns moved to db-init.ts (Phase 3.2)

    const calculateRubberEarn = (deliveryFee: number, status: string) => {
      // 15% commission + 15 THB Platform Fee
      const commission = deliveryFee * 0.15;
      const totalEarn = deliveryFee - commission - 15;
      // Split 50/50 between legs.
      return totalEarn * 0.5;
    };

    const safeParse = (str: string | null | undefined, fallback: any) => {
      try {
        if (!str) return fallback;
        return JSON.parse(str);
      } catch (err) {
        return fallback;
      }
    };

    // 0. Fetch Rubber Profile status and pictureUrl
    const rubberProfile = await db.prepare("SELECT status, pictureUrl FROM rubber_users WHERE id = ?").bind(rubberId).first() as any;
    const verificationStatus = rubberProfile?.status || "unregistered";

    // 1. Available Jobs: 
    // - Must have paymentStatus = 'paid' (confirmed via payment webhook)
    // - AND status = 'searching_driver' AND no pickup driver assigned
    // - OR must be ready_for_pickup and have no delivery driver
    const availableJobs = await db.prepare(`
      SELECT o.*, s.name as serviceName, st.name as storeName, st.address as storeAddress, st.lat as storeLat, st.lng as storeLng
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      JOIN stores st ON o.storeId = st.id
      WHERE (o.status IN ('pending', 'searching_driver') AND o.pickupDriverId IS NULL AND o.paymentStatus = 'paid')
         OR (o.status = 'ready_for_pickup' AND o.deliveryDriverId IS NULL)
    `).all();

    // 2. Active Jobs: rubber is assigned as pickup or delivery driver
    const activeJobs = await db.prepare(`
      SELECT o.*, s.name as serviceName, st.name as storeName, st.address as storeAddress
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      LEFT JOIN stores st ON o.storeId = st.id
      WHERE (o.pickupDriverId = ? AND o.status IN ('picking_up', 'delivering_to_store', 'at_shop', 'washing'))
         OR (o.deliveryDriverId = ? AND o.status IN ('ready_for_pickup', 'delivering_to_customer'))
    `).bind(rubberId, rubberId).all();

    // 3. Completed Jobs: rubber was assigned and order is closed
    const completedJobs = await db.prepare(`
      SELECT o.*, s.name as serviceName, st.name as storeName, st.address as storeAddress
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      LEFT JOIN stores st ON o.storeId = st.id
      WHERE (o.pickupDriverId = ? OR o.deliveryDriverId = ?) 
        AND o.status IN ('completed', 'cancelled')
      ORDER BY o.updatedAt DESC
      LIMIT 50
    `).bind(rubberId, rubberId).all();

    return NextResponse.json({ 
      status: verificationStatus,
      pictureUrl: rubberProfile?.pictureUrl,
      available: availableJobs.results.map((r: any) => ({
        ...r,
        rubberEarn: calculateRubberEarn(r.deliveryFee || 0, r.status),
        address: safeParse(r.address, {}),
        items: safeParse(r.items, [])
      })),
      active: activeJobs.results.map((r: any) => ({
        ...r,
        rubberEarn: calculateRubberEarn(r.deliveryFee || 0, r.status),
        address: safeParse(r.address, {}),
        items: safeParse(r.items, [])
      })),
      completed: completedJobs.results.map((r: any) => ({
        ...r,
        rubberEarn: calculateRubberEarn(r.deliveryFee || 0, r.status),
        address: safeParse(r.address, {}),
        items: safeParse(r.items, [])
      }))
    });
  } catch (error: unknown) {
    console.error("Fetch rubber orders error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * PUT /api/rubber/orders
 * Rubber accepts a job (Pickup or Delivery leg)
 */
export async function PUT(req: Request) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { orderId, rubberId } = await req.json() as any;

    if (!orderId || !rubberId) {
      return NextResponse.json({ error: "Order ID and Rubber ID required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const order = await db.prepare("SELECT status, pickupDriverId, deliveryDriverId FROM orders WHERE id = ?").bind(orderId).first() as any;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const rubber = await db.prepare("SELECT * FROM rubber_users WHERE id = ?").bind(rubberId).first() as any;
    
    // Shadow User Sync for FK
    if (rubber) {
      await db.prepare(`
        INSERT OR IGNORE INTO users (id, displayName, phone, role)
        VALUES (?, ?, ?, 'driver')
      `).bind(rubber.id, rubber.name, rubber.phone).run();
    }

    let assignmentResult;
    let nextStatus: any = null;

    if ((order.status === 'pending' || order.status === 'searching_driver') && !order.pickupDriverId) {
      // Leg 1: Pickup
      assignmentResult = await db.prepare(`
        UPDATE orders SET pickupDriverId = ? WHERE id = ? AND status IN ('pending', 'searching_driver') AND pickupDriverId IS NULL
      `).bind(rubberId, orderId).run();
      nextStatus = "picking_up";
    } else if (order.status === 'ready_for_pickup' && !order.deliveryDriverId) {
      // Leg 2: Delivery
      assignmentResult = await db.prepare(`
        UPDATE orders SET deliveryDriverId = ? WHERE id = ? AND status = 'ready_for_pickup' AND deliveryDriverId IS NULL
      `).bind(rubberId, orderId).run();
      // Keep status as ready_for_pickup so they are directed to the store first
      nextStatus = "ready_for_pickup";
    } else {
      return NextResponse.json({ success: false, error: "งานนี้ไม่พร้อมให้รับหรือถูกรับไปแล้ว" }, { status: 409 });
    }

    if (assignmentResult.meta.changes > 0) {
      const transition = await transitionOrderStatus(
        db, 
        orderId, 
        nextStatus, 
        getRequestContext().env,
        { rubberName: rubber?.name || "Rubber" }
      );
      
      return NextResponse.json({ success: true, message: "Job accepted successfully" });
    } else {
      return NextResponse.json({ success: false, error: "งานนี้ถูกรับไปแล้ว" }, { status: 409 });
    }
  } catch (error: unknown) {
    console.error("Accept job error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
