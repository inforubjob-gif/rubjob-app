import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: Ensure new columns and tables exist
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS store_services (
          storeId TEXT NOT NULL,
          serviceId TEXT NOT NULL,
          price REAL,
          PRIMARY KEY (storeId, serviceId),
          FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
          FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
        )
      `).run();
      await db.prepare("ALTER TABLE stores ADD COLUMN status TEXT DEFAULT 'active'").run();
      await db.prepare("ALTER TABLE stores ADD COLUMN bankName TEXT").run();
      await db.prepare("ALTER TABLE stores ADD COLUMN accountNumber TEXT").run();
      await db.prepare("ALTER TABLE stores ADD COLUMN accountName TEXT").run();
    } catch (e) {}
    

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

    // Fetch documents for all stores
    const { results: storeDocs } = await db.prepare(`
      SELECT * FROM store_documents
    `).all();

    const storesWithServices = stores.map((s: any) => ({
      ...s,
      services: storeServices
        .filter((ss: any) => ss.storeId === s.id)
        .map((ss: any) => ({ serviceId: ss.serviceId, price: ss.price })),
      documents: storeDocs.filter((d: any) => d.storeId === s.id)
    }));

    return NextResponse.json({ stores: storesWithServices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json() as any;
    const { name, ownerId, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, phone, services, bankName, accountNumber, accountName } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!name || !ownerId) return NextResponse.json({ error: "Missing name or ownerId" }, { status: 400 });

    let finalOwnerId = ownerId;
    
    // 🤖 Automation: Create a new system-generated owner if requested
    if (ownerId === "auto") {
      finalOwnerId = `OWNER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      try {
        await db.prepare(`
          INSERT INTO users (id, displayName, role)
          VALUES (?, ?, 'store_admin')
        `).bind(finalOwnerId, `Owner of ${name}`).run();
      } catch (e: any) {
        console.error("Auto-owner creation failed:", e);
        return NextResponse.json({ error: "Could not auto-generate owner: " + e.message }, { status: 500 });
      }
    }

    const id = `STORE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insert store
    await db.prepare(`
      INSERT INTO stores (id, name, ownerId, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, phone, isActive, bankName, accountNumber, accountName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).bind(
      id, name, finalOwnerId, address || "", lat || 0, lng || 0, serviceRadiusKm || 5, baseDeliveryFee || 0, extraFeePerKm || 0, phone || "", 
      bankName || "", accountNumber || "", accountName || ""
    ).run();

    // Sync services with custom prices
    if (services && Array.isArray(services)) {
      for (const svc of services) {
        await db.prepare(`INSERT INTO store_services (storeId, serviceId, price) VALUES (?, ?, ?)`).bind(id, svc.serviceId, svc.price || null).run();
      }
    }

    return NextResponse.json({ success: true, id, ownerId: finalOwnerId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const payload = await req.json() as any;
    const { id, name, ownerId, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, phone, isActive, status, services, bankName, accountNumber, accountName, documents } = payload;
    const db = getRequestContext().env.DB;
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
          phone = COALESCE(?, phone),
          isActive = COALESCE(?, isActive),
          status = COALESCE(?, status),
          bankName = COALESCE(?, bankName),
          accountNumber = COALESCE(?, accountNumber),
          accountName = COALESCE(?, accountName)
      WHERE id = ?
    `).bind(
      name || null, ownerId || null, address || null, lat || null, lng || null, serviceRadiusKm || null, baseDeliveryFee || null, extraFeePerKm || null, phone || null, isActive || null, 
      status || null, bankName || null, accountNumber || null, accountName || null, id
    ).run();

    // Handle documents
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.id) {
          await db.prepare(`UPDATE store_documents SET status = ?, url = ?, notes = ? WHERE id = ?`).bind(doc.status, doc.url, doc.notes, doc.id).run();
        } else {
          const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          await db.prepare(`INSERT INTO store_documents (id, storeId, type, url, status) VALUES (?, ?, ?, ?, ?)`).bind(docId, id, doc.type, doc.url, doc.status || 'pending').run();
        }
      }
    }

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

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`DELETE FROM stores WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
