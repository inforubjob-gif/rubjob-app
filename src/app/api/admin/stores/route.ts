import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { ensureSchema } from "@/lib/db-init";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: tables moved to db-init.ts



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

    const { results: settings } = await db.prepare("SELECT value FROM system_settings WHERE key = 'gp_store_percent'").all();
    const gpStoreRaw = settings?.[0]?.value;
    const gpStoreFraction = gpStoreRaw !== undefined ? (100 - Number(gpStoreRaw)) / 100 : 0.90;

    // Fetch wallet data for all stores in batch
    const { results: storeEarningsData } = await db.prepare(`
      SELECT storeId as id, SUM(laundryFee * ?) as earned
      FROM orders WHERE status = 'completed' AND storeId IS NOT NULL
      GROUP BY storeId
    `).bind(gpStoreFraction).all();
    const { results: storeWithdrawalsData } = await db.prepare(`
      SELECT requesterId as id, SUM(amount) as withdrawn
      FROM payout_requests WHERE requesterType = 'store' AND status != 'rejected'
      GROUP BY requesterId
    `).all();

    const storeEarningsMap: Record<string, number> = {};
    (storeEarningsData as any[]).forEach((r: any) => { storeEarningsMap[r.id] = r.earned || 0; });
    const storeWithdrawnMap: Record<string, number> = {};
    (storeWithdrawalsData as any[]).forEach((r: any) => { storeWithdrawnMap[r.id] = r.withdrawn || 0; });

    const storesWithServices = stores.map((s: any) => ({
      ...s,
      walletBalance: Math.max(0, (storeEarningsMap[s.id] || 0) - (storeWithdrawnMap[s.id] || 0)),
      services: storeServices
        .filter((ss: any) => ss.storeId === s.id)
        .map((ss: any) => ({ serviceId: ss.serviceId, price: ss.price })),
      documents: storeDocs.filter((d: any) => d.storeId === s.id)
    }));

    return NextResponse.json({ stores: storesWithServices });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await req.json() as any;
    const { name, ownerId, email, password, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, phone, machineType, services, bankName, accountNumber, accountName } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await ensureSchema(db);

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
      } catch (e: unknown) {
        console.error("Auto-owner creation failed:", e);
        return NextResponse.json({ error: "Could not auto-generate owner: " + safeError(e) }, { status: 500 });
      }
    }

    const id = `STORE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insert store
    await db.prepare(`
      INSERT INTO stores (id, name, ownerId, email, password, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, phone, machineType, isActive, bankName, accountNumber, accountName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).bind(
      id, name, finalOwnerId || 'system', email || null, password || null, address || "", lat || 0, lng || 0, serviceRadiusKm || 5, baseDeliveryFee || 0, extraFeePerKm || 0, phone || "", machineType || 'separate',
      bankName || "", accountNumber || "", accountName || ""
    ).run();

    // Sync services with custom prices
    if (services && Array.isArray(services)) {
      for (const svc of services) {
        await db.prepare(`INSERT INTO store_services (storeId, serviceId, price) VALUES (?, ?, ?)`).bind(id, svc.serviceId, svc.price || null).run();
      }
    }

    return NextResponse.json({ success: true, id, ownerId: finalOwnerId });
  } catch (error: unknown) {
    console.error("POST /api/admin/stores error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await req.json() as any;
    const { id, name, ownerId, email, password, address, lat, lng, serviceRadiusKm, baseDeliveryFee, extraFeePerKm, phone, machineType, isActive, status, services, bankName, accountNumber, accountName, documents } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db.prepare(`
      UPDATE stores 
      SET name = COALESCE(?, name), 
          ownerId = COALESCE(?, ownerId),
          email = COALESCE(?, email),
          password = COALESCE(?, password),
          address = COALESCE(?, address),
          lat = COALESCE(?, lat),
          lng = COALESCE(?, lng),
          serviceRadiusKm = COALESCE(?, serviceRadiusKm),
          baseDeliveryFee = COALESCE(?, baseDeliveryFee),
          extraFeePerKm = COALESCE(?, extraFeePerKm),
          phone = COALESCE(?, phone),
          machineType = COALESCE(?, machineType),
          isActive = COALESCE(?, isActive),
          status = COALESCE(?, status),
          bankName = COALESCE(?, bankName),
          accountNumber = COALESCE(?, accountNumber),
          accountName = COALESCE(?, accountName)
      WHERE id = ?
    `).bind(
      name || null, ownerId || null, email || null, password || null, address || null, lat || null, lng || null, serviceRadiusKm || null, baseDeliveryFee || null, extraFeePerKm || null, phone || null, machineType || null, isActive || null, 
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
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json() as any;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`DELETE FROM stores WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
