import { NextResponse } from "next/server";
import { getContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const env = (getContext() as any).env;
    const db = env.DB;

    if (id) {
      const order = await db.prepare(`
        SELECT o.*, u.displayName as customerName, u.phone as customerPhone, u.pictureUrl as customerPicture
        FROM orders o
        JOIN users u ON o.userId = u.id
        WHERE o.id = ?
      `).bind(id).first();
      return NextResponse.json({ order });
    }

    // Generic list if no ID
    const orders = await db.prepare(`
      SELECT o.*, u.displayName as customerName
      FROM orders o
      JOIN users u ON o.userId = u.id
      ORDER BY o.createdAt DESC
      LIMIT 100
    `).all();
    
    return NextResponse.json({ orders: orders.results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
