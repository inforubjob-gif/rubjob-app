import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getRequestContext().env.DB;

    // Fetch pending documents from both rider_documents and store_documents
    const riderDocs = await db.prepare(`
      SELECT d.*, r.name as partnerName, r.email as partnerEmail, 'rider' as partnerType
      FROM rider_documents d
      JOIN rider_users r ON d.riderId = r.id
      WHERE d.status = 'pending'
      ORDER BY d.createdAt DESC
    `).all();

    return NextResponse.json({ documents: riderDocs.results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status, notes } = await request.json() as { id: string; status: string; notes?: string };
    const db = getRequestContext().env.DB;

    await db.prepare(`
      UPDATE rider_documents 
      SET status = ?, notes = ?, createdAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(status, notes || null, id).run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
