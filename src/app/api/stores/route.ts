import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/stores
 * Fetches all active stores from Cloudflare D1, including cost matrix
 */
export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const showTest = searchParams.get("isTest") === "1";

    const { results } = await db.prepare(`
      SELECT * FROM stores 
      WHERE isActive = 1 AND (isTest = ? OR isTest IS NULL)
    `).bind(showTest ? 1 : 0).all();

    // Fetch cost matrix for all active stores
    const storeIds = results.map((s: any) => s.id);
    let allWashers: any[] = [];
    let allDryers: any[] = [];

    if (storeIds.length > 0) {
      const placeholders = storeIds.map(() => '?').join(',');
      const { results: washers } = await db.prepare(
        `SELECT * FROM store_washer_costs WHERE storeId IN (${placeholders}) ORDER BY sizeKg ASC`
      ).bind(...storeIds).all();
      allWashers = washers || [];

      const { results: dryers } = await db.prepare(
        `SELECT * FROM store_dryer_costs WHERE storeId IN (${placeholders}) ORDER BY sizeKg ASC`
      ).bind(...storeIds).all();
      allDryers = dryers || [];
    }

    // Attach cost matrix to each store
    const storesWithCosts = results.map((store: any) => ({
      ...store,
      washers: allWashers.filter((w: any) => w.storeId === store.id),
      dryers: allDryers.filter((d: any) => d.storeId === store.id),
    }));

    return NextResponse.json(
      { stores: storesWithCosts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Fetch stores error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

