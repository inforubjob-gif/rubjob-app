import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/orders?userId=...
 * Fetches user orders from Cloudflare D1
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT o.*, s.name as serviceName, s.icon as serviceIcon
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      WHERE o.userId = ?
      ORDER BY o.createdAt DESC
    `).bind(userId).all();

    // Parse JSON strings back to objects
    const orders = results.map((row: any) => ({
      ...row,
      items: JSON.parse(row.items || "[]"),
      address: JSON.parse(row.address || "{}")
    }));

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
