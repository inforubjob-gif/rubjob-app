import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { validateRequired, validatePhone } from "@/lib/validation";

export const runtime = "edge";

/**
 * POST /api/register/store
 * Public endpoint for unauthenticated store registration
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json() as any;
    const { 
      name, address, lat, lng, phone, email,
      bankName, accountNumber, accountName,
      documents 
    } = payload;
    
    validateRequired(name, "Store Name");
    validateRequired(address, "Address");
    validateRequired(phone, "Phone Number");
    validatePhone(phone);

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Generate IDs
    const storeId = `STR-REG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const ownerId = `OWNER-REG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const contactEmail = email || `${ownerId}@rubjob.com`;

    // 2. Create entry in users table (owner record)
    await db.prepare(`
      INSERT INTO users (id, displayName, phone, role)
      VALUES (?, ?, ?, 'store_admin')
    `).bind(ownerId, `Owner of ${name}`, phone).run();

    // 3. Create entry in stores table
    await db.prepare(`
      INSERT INTO stores (id, ownerId, name, address, lat, lng, phone, isActive, status, bankName, accountNumber, accountName)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?)
    `).bind(
      storeId, ownerId, name, address, lat || 0, lng || 0, phone, 
      bankName || "", accountNumber || "", accountName || ""
    ).run();

    // 4. Handle Documents (if provided)
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await db.prepare(`
          INSERT INTO store_documents (id, storeId, type, url, status)
          VALUES (?, ?, ?, ?, 'pending')
        `).bind(docId, storeId, doc.type, doc.url, 'pending').run();
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Store registration submitted successfully",
      storeId: storeId,
      ownerId: ownerId
    });
  } catch (error: any) {
    console.error("Public Store Registration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
