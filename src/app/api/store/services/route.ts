import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getStoreSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * GET /api/store/services?storeId=...
 * Fetch store-specific services and their prices
 */
export async function GET(req: Request) {
  const session = await getStoreSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    if (!storeId) return NextResponse.json({ error: "Missing storeId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Fetch all master laundry services
    const { results: masterServices } = await db.prepare("SELECT * FROM services WHERE isActive = 1 AND category = 'laundry'").all();
    
    // Fetch store overrides
    const { results: overrides } = await db.prepare("SELECT * FROM store_services WHERE storeId = ?").bind(storeId).all();

    const merged = masterServices.map((ms: any) => {
      const override = overrides.find((o: any) => o.serviceId === ms.id);
      return {
        ...ms,
        isEnabled: !!override,
        price: override ? override.price : ms.basePrice
      };
    });

    return NextResponse.json({ services: merged });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/store/services
 * Toggle service or update price
 */
export async function POST(req: Request) {
  const session = await getStoreSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { storeId, serviceId, isEnabled, price } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!storeId || !serviceId) return NextResponse.json({ error: "Missing IDs" }, { status: 400 });

    if (isEnabled) {
      // Upsert into store_services
      await db.prepare(`
        INSERT INTO store_services (storeId, serviceId, price) 
        VALUES (?, ?, ?)
        ON CONFLICT(storeId, serviceId) DO UPDATE SET price = excluded.price
      `).bind(storeId, serviceId, price).run();
    } else {
      // Remove from store_services
      await db.prepare("DELETE FROM store_services WHERE storeId = ? AND serviceId = ?").bind(storeId, serviceId).run();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
