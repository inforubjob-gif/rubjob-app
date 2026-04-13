import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "edge";

/**
 * POST /api/user/sync
 * Syncs LINE Profile data with D1 Database
 */
export async function POST(req: Request) {
  try {
    const { id, displayName, pictureUrl, phone } = await req.json() as any;
    
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // Upsert User (include phone if provided)
    if (phone) {
      await db.prepare(`
        INSERT INTO users (id, displayName, pictureUrl, phone, role, assignedStoreId) 
        VALUES (?, ?, ?, ?, 'user', NULL)
        ON CONFLICT(id) DO UPDATE SET 
          displayName = excluded.displayName,
          pictureUrl = excluded.pictureUrl,
          phone = excluded.phone
      `).bind(id, displayName, pictureUrl, phone).run();
    } else {
      await db.prepare(`
        INSERT INTO users (id, displayName, pictureUrl, role, assignedStoreId) 
        VALUES (?, ?, ?, 'user', NULL)
        ON CONFLICT(id) DO UPDATE SET 
          displayName = excluded.displayName,
          pictureUrl = excluded.pictureUrl
      `).bind(id, displayName, pictureUrl).run();
    }

    // Fetch updated user to return phone status
    const user = await db.prepare(`SELECT phone FROM users WHERE id = ?`).bind(id).first();

    return NextResponse.json({ success: true, phone: user?.phone || null });
  } catch (error: any) {
    console.error("Sync user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
