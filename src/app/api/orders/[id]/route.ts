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

    // Access D1 from Cloudflare context
    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const order = await db.prepare(`
      SELECT o.*, s.name as serviceName, s.icon as serviceIcon, s.estimatedDays
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      WHERE o.id = ?
    `).bind(id).first();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Parse JSON strings back to objects
    const formattedOrder = {
      ...order,
      items: JSON.parse(order.items || "[]"),
      address: JSON.parse(order.address || "{}")
    };

    return NextResponse.json({ order: formattedOrder });
  } catch (error: any) {
    console.error("Fetch order detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
