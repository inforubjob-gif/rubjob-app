import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const runtime = "edge";

/**
 * POST /api/rider/verify/documents
 * Save rider verification documents
 */
export async function POST(req: Request) {
  try {
    const { userId, documents } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!userId || !documents || !Array.isArray(documents)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Process each document
    for (const doc of documents) {
      const docId = `DOC-${nanoid(8).toUpperCase()}`;
      // In a real app, 'url' would be an R2/S3 URL. 
      // For now, we store the placeholder or base64 provided.
      await db.prepare(`
        INSERT INTO rider_documents (id, riderId, type, url, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).bind(docId, userId, doc.type, doc.url).run();
    }

    // Update rider status to 'pending' (waiting for admin approval)
    await db.prepare(`
      UPDATE rider_users SET status = 'pending' WHERE id = ?
    `).bind(userId).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
