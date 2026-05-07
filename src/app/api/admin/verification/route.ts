import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;

    // Fetch pending documents from BOTH rubber_documents and store_documents
    const [rubberDocs, storeDocs] = await db.batch([
      db.prepare(`
        SELECT d.*, r.name as partnerName, r.email as partnerEmail, 'rubber' as partnerType
        FROM rubber_documents d
        JOIN rubber_users r ON d.rubberId = r.id
        WHERE d.status = 'pending'
        ORDER BY d.createdAt DESC
      `),
      db.prepare(`
        SELECT d.*, s.name as partnerName, u.displayName as partnerEmail, 'store' as partnerType
        FROM store_documents d
        JOIN stores s ON d.storeId = s.id
        LEFT JOIN users u ON s.ownerId = u.id
        WHERE d.status = 'pending'
        ORDER BY d.createdAt DESC
      `)
    ]);

    const allDocs = [
      ...(rubberDocs.results || []),
      ...(storeDocs.results || [])
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ documents: allDocs });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, status, notes, partnerType } = await request.json() as { id: string; status: string; notes?: string; partnerType?: string };
    const db = getRequestContext().env.DB;

    // Determine which table to update based on doc ID prefix or partnerType
    const tableName = partnerType === 'store' ? 'store_documents' : 'rubber_documents';

    await db.prepare(`
      UPDATE ${tableName} 
      SET status = ?, notes = ?, createdAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(status, notes || null, id).run();

    // If neither table matched, try the other one as fallback
    if (partnerType !== 'store') {
      try {
        await db.prepare(`UPDATE store_documents SET status = ?, notes = ? WHERE id = ?`).bind(status, notes || null, id).run();
      } catch (e) {}
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
