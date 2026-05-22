import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/rubber/cash-advance/store-costs?storeId=...
 * Public endpoint for Rubber to fetch cost matrix of a specific store
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results: washers } = await db.prepare(
      "SELECT * FROM store_washer_costs WHERE storeId = ? ORDER BY sizeKg ASC"
    ).bind(storeId).all();

    const { results: dryers } = await db.prepare(
      "SELECT * FROM store_dryer_costs WHERE storeId = ? ORDER BY sizeKg ASC"
    ).bind(storeId).all();

    const { results: storeResult } = await db.prepare(
      "SELECT machineType FROM stores WHERE id = ?"
    ).bind(storeId).all();
    const machineType = storeResult?.[0]?.machineType || 'separate';

    return NextResponse.json({ washers, dryers, machineType });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
