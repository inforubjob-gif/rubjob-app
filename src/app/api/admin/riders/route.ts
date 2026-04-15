import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: Ensure rider_number column exists
    try {
      await db.prepare("ALTER TABLE rider_users ADD COLUMN rider_number INTEGER").run();
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS rider_documents (
          id TEXT PRIMARY KEY,
          riderId TEXT NOT NULL,
          type TEXT NOT NULL,
          url TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (riderId) REFERENCES rider_users(id) ON DELETE CASCADE
        )
      `).run();
    } catch (e) {}

    const { results: riders } = await db.prepare(`
      SELECT * FROM rider_users ORDER BY createdAt DESC
    `).all();

    // Fetch documents for all riders
    const { results: docs } = await db.prepare(`
      SELECT * FROM rider_documents
    `).all();

    const ridersWithDocs = riders.map((r: any) => ({
      ...r,
      displayId: r.rider_number ? `RD-${String(r.rider_number).padStart(4, '0')}` : r.id,
      documents: docs.filter((d: any) => d.riderId === r.id)
    }));

    return NextResponse.json({ riders: ridersWithDocs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json() as any;
    const { email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, bankName, accountNumber, accountName } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: Ensure rider_number column exists
    try {
      await db.prepare("ALTER TABLE rider_users ADD COLUMN rider_number INTEGER").run();
    } catch (e) {}

    if (!email || !password || !name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // 1. Get next rider number
    const lastRider = await db.prepare("SELECT rider_number FROM rider_users ORDER BY rider_number DESC LIMIT 1").first() as any;
    const nextNumber = (lastRider?.rider_number || 0) + 1;
    const displayId = `RD-${String(nextNumber).padStart(4, '0')}`;
    const id = `RDR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO rider_users (id, email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, status, rider_number, bankName, accountNumber, accountName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `).bind(
      id, email, password, name, phone || "", vehicleType || "bike", address || "", idNumber || "", licensePlate || "", emergencyContact || "", nextNumber,
      bankName || "", accountNumber || "", accountName || ""
    ).run();

    return NextResponse.json({ success: true, id, displayId });
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const payload = await req.json() as any;
    const { id, status, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, bankName, accountNumber, accountName, documents } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Update main rider info
    await db.prepare(`
      UPDATE rider_users 
      SET status = COALESCE(?, status),
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          vehicleType = COALESCE(?, vehicleType),
          address = COALESCE(?, address),
          idNumber = COALESCE(?, idNumber),
          licensePlate = COALESCE(?, licensePlate),
          emergencyContact = COALESCE(?, emergencyContact),
          bankName = COALESCE(?, bankName),
          accountNumber = COALESCE(?, accountNumber),
          accountName = COALESCE(?, accountName)
      WHERE id = ?
    `).bind(
      status || null, name || null, phone || null, vehicleType || null, address || null, idNumber || null, licensePlate || null, emergencyContact || null, 
      bankName || null, accountNumber || null, accountName || null, id
    ).run();

    // Handle documents if provided
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.id) {
            await db.prepare(`
               UPDATE rider_documents SET status = ?, url = ?, notes = ? WHERE id = ?
            `).bind(doc.status, doc.url, doc.notes, doc.id).run();
        } else {
            const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            await db.prepare(`
               INSERT INTO rider_documents (id, riderId, type, status, url, notes)
               VALUES (?, ?, ?, ?, ?, ?)
            `).bind(docId, id, doc.type, doc.status || 'pending', doc.url || "", doc.notes || "").run();
        }
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
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db.prepare(`DELETE FROM rider_users WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
