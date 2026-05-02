import { NextResponse } from "next/server";
import { getContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET() {
  try {
    const env = (getContext() as any).env;
    const db = env.DB;

    // Fetch pending documents from both rider_documents and store_documents
    // (Assuming store_documents covers Providers if they are Stores, or we add specialist_documents)
    // For now, let's join rider_documents and rider_users
    const riderDocs = await db.prepare(`
      SELECT d.*, r.name as partnerName, r.email as partnerEmail, 'rider' as partnerType
      FROM rider_documents d
      JOIN rider_users r ON d.riderId = r.id
      WHERE d.status = 'pending'
      ORDER BY d.createdAt DESC
    `).all();

    // In a full implementation, we would also UNION with specialist_documents or similar
    
    return NextResponse.json({ documents: riderDocs.results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status, notes } = await request.json();
    const env = (getContext() as any).env;
    const db = env.DB;

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
