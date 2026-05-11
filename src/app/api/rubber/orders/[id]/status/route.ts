import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession } from "@/lib/auth-server";
import { transitionOrderStatus } from "@/lib/order-logic";

export const runtime = "edge";

/**
 * POST /api/rubber/orders/[id]/status
 * Update order status by rubber with optional photo proof
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const { status, photo } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });

    // Self-heal: ensure required columns exist (prevents SQLITE_ERROR on older tables)
    const cols = [
      "ALTER TABLE orders ADD COLUMN evidenceBeforeUrl TEXT",
      "ALTER TABLE orders ADD COLUMN evidenceAfterUrl TEXT",
      "ALTER TABLE orders ADD COLUMN pickupPhotoUrl TEXT",
      "ALTER TABLE orders ADD COLUMN dropoffShopPhotoUrl TEXT",
      "ALTER TABLE orders ADD COLUMN serviceDetails TEXT",
      "ALTER TABLE orders ADD COLUMN arrivedAtShopAt DATETIME",
      "ALTER TABLE orders ADD COLUMN paymentStatus TEXT DEFAULT 'pending'",
    ];
    for (const col of cols) {
      try { await db.prepare(col).run(); } catch (_) {}
    }

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
      getRequestContext().env,
      { evidenceUrl: photo }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Rubber status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
