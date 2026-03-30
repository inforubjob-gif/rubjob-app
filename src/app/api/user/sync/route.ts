import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "edge";

/**
 * POST /api/user/sync
 * Syncs LINE Profile data with D1 Database
 */
export async function POST(req: Request) {
  try {
    const { id, displayName, pictureUrl } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // Upsert User
    await db.prepare(`
      INSERT INTO users (id, displayName, pictureUrl) 
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        displayName = excluded.displayName,
        pictureUrl = excluded.pictureUrl
    `).bind(id, displayName, pictureUrl).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Sync user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
