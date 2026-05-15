import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/auth/link-line
 * Securely links a Rubber or Store account to a LINE User ID
 */
export async function POST(req: Request) {
  try {
    const { type, accountId, lineUserId, token } = await req.json() as any;

    if (!type || !accountId || !lineUserId || !token) {
      return NextResponse.json({ error: "Missing required linking data" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "Database not found" }, { status: 500 });

    // Self-healing: ensure lineUserId column exists

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
    if (type === "rubber") {
      await db.prepare(`UPDATE rubber_users SET lineUserId = ? WHERE id = ?`)
        .bind(lineUserId, accountId).run();
      
      // Ensure entry in 'users' table exists for preferences
      await db.prepare(`
        INSERT OR IGNORE INTO users (id, role, displayName) 
        VALUES (?, 'driver', ?)
      `).bind(accountId, "Rubber").run();
      
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
  } catch (error: unknown) {
    console.error("Link LINE error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * GET /api/auth/link-line?accountId=...
 * Generates a temporary linking token for the UI
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "rubber";
    let accountId = searchParams.get("accountId");

    const db = getRequestContext().env.DB;

    // If accountId is not provided, try to get it from the session
    if (!accountId) {
      const { getRubberSession, getStoreSession } = await import("@/lib/auth-server");
      if (type === "rubber") {
        const session = await getRubberSession();
        accountId = session?.id || null;
      } else if (type === "store") {
        const session = await getStoreSession();
        accountId = session?.id || null;
      }
    }

    if (!accountId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Self-healing: link_tokens table moved to db-init.ts


    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    await db.prepare(`
      INSERT INTO link_tokens (token, accountId) VALUES (?, ?)
    `).bind(token, accountId).run();

    return NextResponse.json({ token, accountId });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
