import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { safeError } from "@/lib/api-utils";

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
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    let query = `
      SELECT o.*, s.name as serviceName, s.icon as serviceIcon, u.displayName as userDisplayName
      FROM orders o
      JOIN services s ON o.serviceId = s.id
      LEFT JOIN users u ON o.userId = u.id
    `;
    
    let rawResults;
    const { results } = await db.prepare(`${query} WHERE o.userId = ? ORDER BY o.createdAt DESC`).bind(userId).all();
    rawResults = results;

    // Parse JSON strings back to objects
    const orders = (rawResults || []).map((row: any) => ({
      ...row,
      items: JSON.parse(row.items || "[]"),
      address: JSON.parse(row.address || "{}")
    }));

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}


