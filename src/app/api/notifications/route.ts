import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * Self-healing: ensure notifications table exists
 */
async function ensureNotificationsTable(db: any) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userType TEXT DEFAULT 'rubber',
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        isRead INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (e) {}
}

/**
 * Resolve identity from cookies
 */
async function resolveIdentity(): Promise<{ id: string; type: string } | null> {
  const cookieStore = await cookies();
  const rubberToken = cookieStore.get("rubber_token")?.value;
  if (rubberToken) return { id: rubberToken, type: "rubber" };
  const storeToken = cookieStore.get("store_token")?.value;
  if (storeToken) return { id: storeToken, type: "store" };
  return null;
}

/**
 * GET /api/notifications?limit=20&unreadOnly=true
 * Fetch notifications for the current user
 */
export async function GET(req: Request) {
  const identity = await resolveIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getRequestContext().env.DB;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  await ensureNotificationsTable(db);

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "30");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  // Fetch notifications
  const query = unreadOnly
    ? `SELECT * FROM notifications WHERE userId = ? AND isRead = 0 ORDER BY createdAt DESC LIMIT ?`
    : `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`;

  const { results } = await db.prepare(query).bind(identity.id, limit).all();

  // Count unread
  const unreadRes = await db.prepare(
    `SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0`
  ).bind(identity.id).first() as any;

  return NextResponse.json({
    notifications: results || [],
    unreadCount: unreadRes?.count || 0
  });
}

/**
 * POST /api/notifications
 * Mark notifications as read, or create a notification (admin/system)
 */
export async function POST(req: Request) {
  const identity = await resolveIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getRequestContext().env.DB;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  await ensureNotificationsTable(db);

  const body = await req.json() as any;

  // Mark single notification as read
  if (body.action === "markRead" && body.notificationId) {
    await db.prepare(
      `UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?`
    ).bind(body.notificationId, identity.id).run();
    return NextResponse.json({ success: true });
  }

  // Mark all notifications as read
  if (body.action === "markAllRead") {
    await db.prepare(
      `UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0`
    ).bind(identity.id).run();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
