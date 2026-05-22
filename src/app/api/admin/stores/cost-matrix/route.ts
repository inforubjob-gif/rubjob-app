import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { nanoid } from "nanoid";

export const runtime = "edge";

/**
 * GET /api/admin/stores/cost-matrix?storeId=...
 * Fetch washer + dryer cost matrix for a store
 */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({ washers, dryers });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * POST /api/admin/stores/cost-matrix
 * Upsert washer + dryer cost matrix (delete all + re-insert)
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { storeId, washers, dryers } = await req.json() as any;
    if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Delete existing entries
    await db.prepare("DELETE FROM store_washer_costs WHERE storeId = ?").bind(storeId).run();
    await db.prepare("DELETE FROM store_dryer_costs WHERE storeId = ?").bind(storeId).run();

    // Insert washers
    if (washers && Array.isArray(washers)) {
      for (const w of washers) {
        const id = `WC-${nanoid(8)}`;
        await db.prepare(
          "INSERT INTO store_washer_costs (id, storeId, sizeKg, sizeLabel, priceCold, priceWarm, priceHot) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, storeId, w.sizeKg, w.sizeLabel || null, w.priceCold, w.priceWarm, w.priceHot).run();
      }
    }

    // Insert dryers
    if (dryers && Array.isArray(dryers)) {
      for (const d of dryers) {
        const id = `DC-${nanoid(8)}`;
        await db.prepare(
          "INSERT INTO store_dryer_costs (id, storeId, sizeKg, sizeLabel, price, durationMinutes, extraPricePerMinute) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, storeId, d.sizeKg, d.sizeLabel || null, d.price, d.durationMinutes || null, d.extraPricePerMinute || null).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
