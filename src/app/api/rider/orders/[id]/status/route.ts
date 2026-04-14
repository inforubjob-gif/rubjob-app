import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { transitionOrderStatus } from "@/lib/order-logic";

export const runtime = "edge";

/**
 * POST /api/rider/orders/[id]/status
 * Update order status by rider with optional photo proof
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { status, photo } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });

    // 1. Fetch current order to get serviceDetails
    const order = await db.prepare("SELECT serviceDetails, userId FROM orders WHERE id = ?").bind(id).first() as any;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // 2. Update serviceDetails with photo if provided
    let serviceDetails = {};
    try {
      serviceDetails = order.serviceDetails ? JSON.parse(order.serviceDetails) : {};
    } catch (e) {
      serviceDetails = {};
    }

    if (photo) {
      // Store the latest proof photo in the JSON object
      (serviceDetails as any).proofPhotos = (serviceDetails as any).proofPhotos || {};
      (serviceDetails as any).proofPhotos[status] = photo;
      
      await db.prepare("UPDATE orders SET serviceDetails = ? WHERE id = ?")
        .bind(JSON.stringify(serviceDetails), id)
        .run();
    }

    // 3. Perform transition (includes notifications)
    const result = await transitionOrderStatus(
      db, 
      id, 
      status, 
      getRequestContext().env
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Rider status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
