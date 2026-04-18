import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/auth/link-line
 * Securely links a Rider or Store account to a LINE User ID
 */
export async function POST(req: Request) {
  try {
    const { type, accountId, lineUserId, token } = await req.json() as any;

    if (!type || !accountId || !lineUserId || !token) {
      return NextResponse.json({ error: "Missing required linking data" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "Database not found" }, { status: 500 });

    // 1. Validate the linking token (Nonce)
    // We expect a token that was generated in the previous session
    const tokenRecord = await db.prepare(`
      SELECT * FROM link_tokens WHERE token = ? AND accountId = ? AND used = 0
    `).bind(token, accountId).first() as any;

    if (!tokenRecord) {
      return NextResponse.json({ error: "Invalid or expired linking token" }, { status: 403 });
    }

    // Check expiry (5 minutes)
    const createdAt = new Date(tokenRecord.createdAt).getTime();
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Linking token has expired" }, { status: 403 });
    }

    // 2. Perform Link & Ensure generic user entry exists for preferences
    if (type === "rider") {
      await db.prepare(`UPDATE rider_users SET lineUserId = ? WHERE id = ?`)
        .bind(lineUserId, accountId).run();
      
      // Ensure entry in 'users' table exists for preferences
      await db.prepare(`
        INSERT OR IGNORE INTO users (id, role, displayName) 
        VALUES (?, 'driver', ?)
      `).bind(accountId, "Rider").run();
      
    } else if (type === "store") {
      await db.prepare(`UPDATE stores SET lineUserId = ? WHERE id = ?`)
        .bind(lineUserId, accountId).run();

      // Ensure entry in 'users' table exists for preferences
      await db.prepare(`
        INSERT OR IGNORE INTO users (id, role, displayName) 
        VALUES (?, 'store_admin', ?)
      `).bind(accountId, "Store Owner").run();
    }

    // 3. Mark token as used
    await db.prepare(`UPDATE link_tokens SET used = 1 WHERE token = ?`).bind(token).run();

    return NextResponse.json({ success: true, message: "Account linked successfully" });
  } catch (error: any) {
    console.error("Link LINE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/auth/link-line?accountId=...
 * Generates a temporary linking token for the UI
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) return NextResponse.json({ error: "AccountId required" }, { status: 400 });

    const db = getRequestContext().env.DB;
    
    // Self-healing: Table for linking tokens
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS link_tokens (
          token TEXT PRIMARY KEY,
          accountId TEXT NOT NULL,
          used INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (e) {}

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    await db.prepare(`
      INSERT INTO link_tokens (token, accountId) VALUES (?, ?)
    `).bind(token, accountId).run();

    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
