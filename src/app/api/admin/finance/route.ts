import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results } = await db.prepare(`
      SELECT o.id, o.storeId, o.totalPrice, o.laundryFee, o.deliveryFee, o.status, o.createdAt,
             u.displayName as customerName, s.name as storeName, r.displayName as riderName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN stores s ON o.storeId = s.id
      LEFT JOIN users r ON o.deliveryDriverId = r.id
      WHERE o.status = 'completed'
      ORDER BY o.createdAt DESC
      LIMIT 100
    `).all();

    return NextResponse.json({ transactions: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
