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

    // Self-healing: Ensure required columns and tables exist
    await ensureSchema(db);

    const { results: rubbers } = await db.prepare(`
      SELECT r.*, u.displayName as lineDisplayName 
      FROM rubber_users r
      LEFT JOIN users u ON r.lineUserId = u.id
      ORDER BY r.createdAt DESC
    `).all();

    // Fetch documents for all rubbers
    const { results: docs } = await db.prepare(`
      SELECT * FROM rubber_documents
    `).all();

    const rubbersWithDocs = rubbers.map((r: any) => {
      let workStatus = false;
      try {
        const prefs = r.preferences ? JSON.parse(r.preferences) : {};
        workStatus = !!prefs.workStatus;
      } catch (e) {}
      return {
        ...r,
        workStatus,
        displayId: r.rubber_number ? `RD-${String(r.rubber_number).padStart(4, '0')}` : r.id,
        documents: docs.filter((d: any) => d.rubberId === r.id)
      };
    });

    return NextResponse.json({ rubbers: rubbersWithDocs });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await req.json() as any;
    const { email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, bankName, accountNumber, accountName } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: Ensure required columns exist
    await ensureSchema(db);

    if (!email || !password || !name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // 1. Get next rubber number
    const lastRubber = await db.prepare("SELECT rubber_number FROM rubber_users ORDER BY rubber_number DESC LIMIT 1").first() as any;
    const nextNumber = (lastRubber?.rubber_number || 0) + 1;
    const displayId = `RD-${String(nextNumber).padStart(4, '0')}`;
    const id = `RDR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO rubber_users (id, email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, status, rubber_number, bankName, accountNumber, accountName, pictureUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
    `).bind(
      id, email, password, name, phone || "", vehicleType || "bike", address || "", idNumber || "", licensePlate || "", emergencyContact || "", nextNumber,
      bankName || "", accountNumber || "", accountName || "", payload.pictureUrl || ""
    ).run();

    return NextResponse.json({ success: true, id, displayId });
  } catch (error: unknown) {
    if (((error instanceof Error) ? safeError(error) : "").includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await req.json() as any;
    const { id, status, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, bankName, accountNumber, accountName, documents } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Update main rubber info
    await db.prepare(`
      UPDATE rubber_users 
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
          accountName = COALESCE(?, accountName),
          pictureUrl = COALESCE(?, pictureUrl)
      WHERE id = ?
    `).bind(
      status || null, name || null, phone || null, vehicleType || null, address || null, idNumber || null, licensePlate || null, emergencyContact || null, 
      bankName || null, accountNumber || null, accountName || null, payload.pictureUrl || null, id
    ).run();

    // Handle documents if provided
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.id) {
            await db.prepare(`
               UPDATE rubber_documents SET status = ?, url = ?, notes = ? WHERE id = ?
            `).bind(doc.status, doc.url, doc.notes, doc.id).run();
        } else {
            const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            await db.prepare(`
               INSERT INTO rubber_documents (id, rubberId, type, status, url, notes)
               VALUES (?, ?, ?, ?, ?, ?)
            `).bind(docId, id, doc.type, doc.status || 'pending', doc.url || "", doc.notes || "").run();
        }
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
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db.prepare(`DELETE FROM rubber_users WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
