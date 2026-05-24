import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession } from "@/lib/auth-server";
import { transitionOrderStatus } from "@/lib/order-logic";
import { safeError } from "@/lib/api-utils";
import { nanoid } from "nanoid";

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

    // Self-healing columns moved to db-init.ts (Phase 3.2)

    // 1. Fetch current order to get serviceDetails, store info and laundryCost
    const order = await db.prepare(`
      SELECT o.serviceDetails, o.userId, o.storeId, o.laundryCost, s.name as storeName 
      FROM orders o 
      LEFT JOIN stores s ON o.storeId = s.id 
      WHERE o.id = ?
    `).bind(id).first() as any;
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

    // 4. Auto-record default cash advance if reaching at_shop and no record exists
    if (status === "at_shop" && order.laundryCost > 0) {
      try {
        const existingCA = await db.prepare("SELECT id FROM cash_advances WHERE orderId = ?").bind(id).first();
        if (!existingCA) {
          const caId = `CA-${nanoid(8).toUpperCase()}`;
          await db.prepare(`
            INSERT INTO cash_advances (id, rubberId, orderId, storeId, storeName, machineType, amount, note, status)
            VALUES (?, ?, ?, ?, ?, 'default', ?, 'Auto-recorded default cost', 'pending')
          `).bind(caId, session.id, id, order.storeId || '', order.storeName || 'Unknown Store', order.laundryCost).run();
        }
      } catch (err) {
        console.error("Auto cash advance error:", err);
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Rubber status update error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
