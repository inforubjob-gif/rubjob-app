import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

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
        p.name as providerName,
        srv.name as serviceName
      FROM orders o
      JOIN users u ON o.userId = u.id
      LEFT JOIN stores s ON o.storeId = s.id
      LEFT JOIN rubber_users r ON o.deliveryDriverId = r.id
      LEFT JOIN specialist_profiles sp ON o.providerId = sp.id
      LEFT JOIN users p ON sp.id = p.id
      LEFT JOIN services srv ON o.serviceId = srv.id
      WHERE o.rating IS NOT NULL OR o.review_text IS NOT NULL OR o.storeRating IS NOT NULL OR o.driverRating IS NOT NULL
      ORDER BY o.createdAt DESC
    `).all();

    return NextResponse.json({ reviews: results });
  } catch (error: any) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
