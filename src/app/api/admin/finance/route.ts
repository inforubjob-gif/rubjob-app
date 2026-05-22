import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results } = await db.prepare(`
      SELECT o.id, o.storeId, o.totalPrice, o.laundryFee, o.deliveryFee, o.status, o.createdAt,
             u.displayName as customerName, s.name as storeName, r.name as rubberName,
             COALESCE(ca_sum.storeCost, 0) as storeCost
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN stores s ON o.storeId = s.id
      LEFT JOIN rubber_users r ON o.deliveryDriverId = r.id
      LEFT JOIN (
        SELECT orderId, SUM(amount) as storeCost
        FROM cash_advances
        WHERE status IN ('pending', 'settled')
        GROUP BY orderId
      ) ca_sum ON ca_sum.orderId = o.id
      WHERE o.status = 'completed'
      ORDER BY o.createdAt DESC
      LIMIT 100
    `).all();

    return NextResponse.json({ transactions: results });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
