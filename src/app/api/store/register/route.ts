import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const payload = await req.json() as any;
    const { email, password, name, phone, type, storeName, storeAddress, bankName, accountNumber, accountName, idCardUrl, businessDocUrl } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!email || !password || !name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // 1. Create User
    const userId = `USR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    await db.prepare(`
      INSERT INTO users (id, displayName, phone, role)
      VALUES (?, ?, ?, ?)
    `).bind(userId, name, phone || "", type === 'store' ? 'store_admin' : 'specialist').run();

    // 2. If Store, create Store entry with bank info
    if (type === 'store') {
      const storeId = `STR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      await db.prepare(`
        INSERT INTO stores (id, ownerId, name, address, status, bankName, accountNumber, accountName)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
      `).bind(storeId, userId, storeName || name, storeAddress || "", bankName || "", accountNumber || "", accountName || "").run();

      // 3. Store Documents
      if (idCardUrl) {
        const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await db.prepare(`INSERT INTO store_documents (id, storeId, type, url, status) VALUES (?, ?, 'id_card', ?, 'pending')`).bind(docId, storeId, idCardUrl).run();
      }
      if (businessDocUrl) {
        const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await db.prepare(`INSERT INTO store_documents (id, storeId, type, url, status) VALUES (?, ?, 'business_license', ?, 'pending')`).bind(docId, storeId, businessDocUrl).run();
      }
    } else if (type === 'specialist') {
      await db.prepare(`
        INSERT INTO specialist_profiles (id, status, bankName, accountNumber, accountName)
        VALUES (?, 'pending', ?, ?, ?)
      `).bind(userId, bankName || "", accountNumber || "", accountName || "").run();
      
      // Specialist documents (using store_documents table for now or creating specialist_documents)
      // For simplicity, let's assume specialists also go to store_documents or we add a table
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
