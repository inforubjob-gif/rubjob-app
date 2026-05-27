import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db-init";

export const runtime = "edge";

/**
 * POST /api/user/sync
 * Syncs LINE Profile data with D1 Database
 */
export async function POST(req: Request) {
  try {
    const { id, displayName, pictureUrl, phone, nickname, birthday, gender } = await req.json() as any;
    
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Access D1 from Cloudflare context
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // Self-healing: ensure schema and new columns exist
    await ensureSchema(db);

    // Upsert User (include phone if provided)
    // On INSERT (new user): set role='user' as default.
    // On UPDATE (existing user): only sync profile fields — never reset
    // role, walletPin, or preferences as those are managed elsewhere.
    if (phone) {
      await db.prepare(`
        INSERT INTO users (id, displayName, pictureUrl, phone, nickname, birthday, gender, role, assignedStoreId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'user', NULL)
        ON CONFLICT(id) DO UPDATE SET 
          displayName = excluded.displayName,
          pictureUrl = excluded.pictureUrl,
          phone = excluded.phone,
          nickname = excluded.nickname,
          birthday = excluded.birthday,
          gender = excluded.gender,
          role = CASE WHEN users.role = 'deleted' THEN 'user' ELSE users.role END
      `).bind(id, nickname || displayName, pictureUrl, phone, nickname || null, birthday || null, gender || null).run();
    } else {
      await db.prepare(`
        INSERT INTO users (id, displayName, pictureUrl, role, assignedStoreId) 
        VALUES (?, ?, ?, 'user', NULL)
        ON CONFLICT(id) DO UPDATE SET 
          displayName = excluded.displayName,
          pictureUrl = excluded.pictureUrl,
          role = CASE WHEN users.role = 'deleted' THEN 'user' ELSE users.role END
      `).bind(id, displayName, pictureUrl).run();
    }

    // Fetch updated user to return phone status
    const user = await db.prepare(`SELECT phone FROM users WHERE id = ?`).bind(id).first();

    return NextResponse.json({ success: true, phone: user?.phone || null });
  } catch (error: unknown) {
    console.error("Sync user error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
