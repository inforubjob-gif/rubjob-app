import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/settings/pricing
 * Public endpoint — returns non-sensitive pricing settings for frontend calculation.
 * No auth required (these are not secrets).
 */
export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const keys = [
      "gp_store_percent",
      "gp_rubber_percent",
      "platform_fee_per_delivery",
      "delivery_fee_base",
    ];

    const { results } = await db.prepare(`
      SELECT key, value FROM system_settings WHERE key IN (${keys.map(() => "?").join(",")})
    `).bind(...keys).all();

    const map: Record<string, string> = {};
    for (const row of (results as any[])) {
      map[row.key] = row.value;
    }

    return NextResponse.json({
      gpStorePercent: parseFloat(map["gp_store_percent"] || "0"),
      gpRubberPercent: parseFloat(map["gp_rubber_percent"] || "0"),
      platformFeePerDelivery: parseFloat(map["platform_fee_per_delivery"] || "10"),
      deliveryFeeBase: parseFloat(map["delivery_fee_base"] || "50"),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load pricing config" }, { status: 500 });
  }
}
