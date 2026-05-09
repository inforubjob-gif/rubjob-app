import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const payload = await req.json() as any;
    const { email, password, name, phone, province, area, vehicleType, licensePlate, idNumber, bankName, accountNumber, accountName, idCardUrl, licenseUrl } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!email || !password || !name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // 1. Get next rubber number
    const lastRubber = await db.prepare("SELECT rubber_number FROM rubber_users ORDER BY rubber_number DESC LIMIT 1").first() as any;
    const nextNumber = (lastRubber?.rubber_number || 0) + 1;
    const id = `RDR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 2. Insert with 'pending' status for admin verification
    await db.prepare(`
      INSERT INTO rubber_users (id, email, password, name, phone, status, rubber_number, vehicleType, licensePlate, idNumber, bankName, accountNumber, accountName, address)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, email, password, name, phone || "", nextNumber, vehicleType || "bike", licensePlate || "", idNumber || "", bankName || "", accountNumber || "", accountName || "", province ? `ย่าน/ตำบล: ${area || '-'}\nจังหวัด: ${province}` : "").run();

    // 3. Insert documents
    if (idCardUrl) {
      const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await db.prepare(`INSERT INTO rubber_documents (id, rubberId, type, url, status) VALUES (?, ?, 'id_card', ?, 'pending')`).bind(docId, id, idCardUrl).run();
    }
    if (licenseUrl) {
      const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await db.prepare(`INSERT INTO rubber_documents (id, rubberId, type, url, status) VALUES (?, ?, 'license', ?, 'pending')`).bind(docId, id, licenseUrl).run();
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
