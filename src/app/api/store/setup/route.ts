import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { validateRequired } from "@/lib/validation";

export const runtime = "edge";

/**
 * POST /api/store/setup
 * Handle new store partner registration
 */
export async function POST(req: Request) {
  try {
    const { ownerId, name, address, lat, lng } = await req.json() as any;
    
    validateRequired(ownerId, "ownerId");
    validateRequired(name, "Store Name");
    validateRequired(address, "Store Address");

    const db = getRequestContext().env.DB;

    // 1. Check if user already owns a store
    const existingStore = await db.prepare("SELECT id FROM stores WHERE ownerId = ?").bind(ownerId).first();
    if (existingStore) {
      return NextResponse.json({ error: "User already owns a store" }, { status: 400 });
    }

    const storeId = `STORE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 2. Create Store
    await db.prepare(`
      INSERT INTO stores (id, ownerId, name, address, lat, lng, isActive)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).bind(storeId, ownerId, name, address, lat || 0, lng || 0).run();

    // 3. Update User Role and assignedStoreId
    await db.prepare(`
      UPDATE users 
      SET role = 'store_admin', assignedStoreId = ? 
      WHERE id = ?
    `).bind(storeId, ownerId).run();

    // 4. Initialize default services for this store
    const services = await db.prepare("SELECT id, basePrice FROM services WHERE isActive = 1").all();
    if (services.results) {
      for (const svc of services.results as any[]) {
        await db.prepare(`
          INSERT INTO store_services (storeId, serviceId, price) 
          VALUES (?, ?, ?)
        `).bind(storeId, svc.id, svc.basePrice).run();
      }
    }

    return NextResponse.json({ success: true, storeId });
  } catch (error: any) {
    console.error("Store setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
