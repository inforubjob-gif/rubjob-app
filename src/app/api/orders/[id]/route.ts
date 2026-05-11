import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";
import Stripe from "stripe";

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
      LEFT JOIN stores st ON o.storeId = st.id
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
 
    const deliveryFee = order.deliveryFee || 0;
    // 15% commission + 15 THB Platform Fee
    const totalRubberPayout = deliveryFee - (deliveryFee * 0.15) - 15;
    
    order.rubberEarn = totalRubberPayout; // Legacy field for backwards compatibility
    order.rubberPickupEarn = totalRubberPayout * 0.5;
    order.rubberDeliveryEarn = totalRubberPayout * 0.5;

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Fetch order detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id]
 * Updates an order (e.g. Cancel order)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as { action: string };
    
    if (body.action !== "cancel") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // Check if order can be cancelled
    const order = await db.prepare("SELECT status, paymentStatus, paymentMethod FROM orders WHERE id = ?").bind(id).first() as any;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow cancellation if order is pending and NOT paid (unless cash)
    if (order.status !== "pending") {
      return NextResponse.json({ error: "ไม่สามารถยกเลิกออเดอร์ที่กำลังดำเนินการได้" }, { status: 400 });
    }
    
    if (order.paymentMethod !== "cash" && order.paymentStatus === "paid") {
      return NextResponse.json({ error: "ไม่สามารถยกเลิกออเดอร์ที่ชำระเงินแล้วได้ กรุณาติดต่อแอดมิน" }, { status: 400 });
    }

    await db.prepare("UPDATE orders SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();

    // Cancel Stripe PaymentIntent if pending
    if (order.paymentMethod === "promptpay" && order.paymentStatus === "pending") {
      try {
        const env = getRequestContext().env as any;
        let stripeSecretKey = env?.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'stripe_secret_key'").first() as { value: string };
          stripeSecretKey = setting?.value;
        }

        if (stripeSecretKey) {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2024-06-20",
            httpClient: Stripe.createFetchHttpClient(),
          });
          
          const intents = await stripe.paymentIntents.search({
            query: `metadata['orderId']:'${id}' AND status:'requires_action'`,
          });
          
          for (const intent of intents.data) {
            await stripe.paymentIntents.cancel(intent.id);
          }
        }
      } catch (e) {
        console.error("Failed to cancel stripe payment intent", e);
      }
    }

    return NextResponse.json({ success: true, message: "Order cancelled successfully" });
  } catch (error: any) {
    console.error("Update order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

