import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results: stores } = await db.prepare(`
      SELECT s.*, u.displayName as ownerName, COUNT(o.id) as orderCount
      FROM stores s
      LEFT JOIN users u ON s.ownerId = u.id
      LEFT JOIN orders o ON s.id = o.storeId
      GROUP BY s.id
      ORDER BY s.createdAt DESC
    `).all();

    // Fetch services with prices for each store
    const { results: storeServices } = await db.prepare(`
      SELECT storeId, serviceId, price FROM store_services
    `).all();

    const storesWithServices = stores.map((s: any) => ({
      ...s,
      services: storeServices
        .filter((ss: any) => ss.storeId === s.id)
        .map((ss: any) => ({ serviceId: ss.serviceId, price: ss.price }))
    }));

    return NextResponse.json({ stores: storesWithServices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, ownerId, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, services } = await req.json() as any;
    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!name || !ownerId) return NextResponse.json({ error: "Missing name or ownerId" }, { status: 400 });

    const id = `STORE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insert store
    await db.prepare(`
      INSERT INTO stores (id, name, ownerId, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      id, name, ownerId, address || "", lat || 0, lng || 0, serviceRadiusKm || 5, baseDeliveryFee || 0, extraFeePerKm || 0
    ).run();

    // Sync services with custom prices
    if (services && Array.isArray(services)) {
      for (const svc of services) {
        await db.prepare(`INSERT INTO store_services (storeId, serviceId, price) VALUES (?, ?, ?)`).bind(id, svc.serviceId, svc.price || null).run();
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, name, ownerId, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, isActive, services } = await req.json() as any;
    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db.prepare(`
      UPDATE stores 
      SET name = COALESCE(?, name), 
          ownerId = COALESCE(?, ownerId),
          address = COALESCE(?, address),
          lat = COALESCE(?, lat),
          lng = COALESCE(?, lng),
          serviceRadiusKm = COALESCE(?, serviceRadiusKm),
          baseDeliveryFee = COALESCE(?, baseDeliveryFee),
          extraFeePerKm = COALESCE(?, extraFeePerKm),
          isActive = COALESCE(?, isActive)
      WHERE id = ?
    `).bind(
      name, ownerId, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, isActive, id
    ).run();

    // Sync services with custom prices
    if (services && Array.isArray(services)) {
      await db.prepare(`DELETE FROM store_services WHERE storeId = ?`).bind(id).run();
      for (const svc of services) {
        await db.prepare(`INSERT INTO store_services (storeId, serviceId, price) VALUES (?, ?, ?)`).bind(id, svc.serviceId, svc.price || null).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json() as any;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`DELETE FROM stores WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
