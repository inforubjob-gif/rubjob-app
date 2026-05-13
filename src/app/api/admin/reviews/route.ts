import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { safeError } from "@/lib/api-utils";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    // Self-healing columns moved to db-init.ts (Phase 3.2)

    const { results } = await db.prepare(`
      SELECT 
        o.id as orderId, 
        o.rating, 
        o.review_text as reviewText, 
        o.storeRating,
        o.storeReview,
        o.driverRating,
        o.driverReview,
        o.createdAt,
        u.displayName as customerName,
        u.pictureUrl as customerAvatar,
        s.name as storeName,
        r.name as rubberName,
        srv.name as serviceName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      LEFT JOIN stores s ON o.storeId = s.id
      LEFT JOIN rubber_users r ON o.deliveryDriverId = r.id
      LEFT JOIN services srv ON o.serviceId = srv.id
      WHERE o.rating IS NOT NULL OR o.review_text IS NOT NULL OR o.storeRating IS NOT NULL OR o.driverRating IS NOT NULL
      ORDER BY o.createdAt DESC
    `).all();

    return NextResponse.json({ reviews: results });
  } catch (error: unknown) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
