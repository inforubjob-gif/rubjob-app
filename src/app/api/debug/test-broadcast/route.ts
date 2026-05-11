import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { broadcastToEligibleRubbers } from "@/lib/dispatch";

export const runtime = "edge";

export async function GET() {
  try {
    const env = getRequestContext().env as any;
    const db = env.DB;
    
    // Get latest order
    const order = await db.prepare("SELECT * FROM orders ORDER BY createdAt DESC LIMIT 1").first() as any;
    if (!order) return NextResponse.json({ error: "No orders found" });

    // Broadcast
    let addressObj = {};
    try { addressObj = JSON.parse(order.address); } catch(e) {}
    
    await broadcastToEligibleRubbers(
      db, env, order.id,
      addressObj,
      order.deliveryFee || 0,
      order.status
    );

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
