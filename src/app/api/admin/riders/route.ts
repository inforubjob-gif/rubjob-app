import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

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
    const { email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!email || !password || !name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // 1. Get next rider number
    const lastRider = await db.prepare("SELECT rider_number FROM rider_users ORDER BY rider_number DESC LIMIT 1").first() as any;
    const nextNumber = (lastRider?.rider_number || 0) + 1;
    const displayId = `RD-${String(nextNumber).padStart(4, '0')}`;
    const id = `RDR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO rider_users (id, email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, status, rider_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(
      id, email, password, name, phone || "", vehicleType || "bike", address || "", idNumber || "", licensePlate || "", emergencyContact || "", nextNumber
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
    const { id, status, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, documents } = await req.json() as any;
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
          emergencyContact = COALESCE(?, emergencyContact)
      WHERE id = ?
    `).bind(
      status || null, name || null, phone || null, vehicleType || null, address || null, idNumber || null, licensePlate || null, emergencyContact || null, id
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
