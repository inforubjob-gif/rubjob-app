import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { notifyAdminLine } from "@/lib/support-notify";

export const runtime = "edge";

/**
 * Resolve the caller identity from cookies.
 * Returns { id, type } where type is 'rubber' | 'store'.
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
 * GET /api/support/tickets
 * - No params → list my tickets
 * - ?id=TICKET_ID → get messages for that ticket
 */
export async function GET(req: Request) {
  const identity = await resolveIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getRequestContext().env.DB;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  // Self-healing: ensure columns exist

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("id");

  if (ticketId) {
    // Verify ownership
    const ticket = await db.prepare(
      "SELECT id FROM support_tickets WHERE id = ? AND userId = ?"
    ).bind(ticketId, identity.id).first();
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const { results } = await db.prepare(
      "SELECT * FROM support_messages WHERE ticketId = ? ORDER BY createdAt ASC"
    ).bind(ticketId).all();
    return NextResponse.json({ messages: results });
  }

  // List all tickets for this user
  const { results } = await db.prepare(`
    SELECT t.*,
      (SELECT content FROM support_messages WHERE ticketId = t.id ORDER BY createdAt DESC LIMIT 1) as lastMessage,
      (SELECT createdAt FROM support_messages WHERE ticketId = t.id ORDER BY createdAt DESC LIMIT 1) as lastMessageAt,
      (SELECT COUNT(*) FROM support_messages WHERE ticketId = t.id AND senderType = 'admin' AND createdAt > COALESCE(
        (SELECT MAX(createdAt) FROM support_messages WHERE ticketId = t.id AND senderType != 'admin'), '1970-01-01'
      )) as unreadCount
    FROM support_tickets t
    WHERE t.userId = ?
    ORDER BY t.updatedAt DESC
  `).bind(identity.id).all();

  return NextResponse.json({ tickets: results });
}

/**
 * POST /api/support/tickets
 * Create a new ticket or send a message to an existing one.
 * Body: { subject?, ticketId?, message }
 */
export async function POST(req: Request) {
  const identity = await resolveIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getRequestContext().env.DB;
  const env = getRequestContext().env as any;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  // Self-healing

  // Ensure userId exists in users table (FK constraint)
  // Rubber/Store IDs live in separate tables but FK references users(id)
  try {
    const role = identity.type === "rubber" ? "driver" : identity.type === "store" ? "store_admin" : "user";
    await db.prepare(`INSERT OR IGNORE INTO users (id, role, displayName) VALUES (?, ?, ?)`)
      .bind(identity.id, role, identity.type === "rubber" ? "Rubber" : "Store").run();
  } catch (e) {}

  const body = await req.json() as any as { subject?: string; ticketId?: string; message: string };
  const { subject, ticketId, message } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  let targetTicketId = ticketId;
  let isNewTicket = false;

  if (!targetTicketId) {
    // Create new ticket
    const newId = `TKT-${identity.type.toUpperCase()}-${Date.now()}`;
    await db.prepare(`
      INSERT INTO support_tickets (id, userId, channel, status, subject, userType)
      VALUES (?, ?, 'in_app', 'open', ?, ?)
    `).bind(newId, identity.id, subject || "ติดต่อแอดมิน", identity.type).run();
    targetTicketId = newId;
    isNewTicket = true;
  } else {
    // Verify ownership
    const ticket = await db.prepare(
      "SELECT id FROM support_tickets WHERE id = ? AND userId = ?"
    ).bind(targetTicketId, identity.id).first();
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Insert message
  const msgId = `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  await db.prepare(`
    INSERT INTO support_messages (id, ticketId, senderType, senderId, content)
    VALUES (?, ?, ?, ?, ?)
  `).bind(msgId, targetTicketId, identity.type, identity.id, message.trim()).run();

  // Update ticket timestamp
  await db.prepare(`
    UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP, status = 'open' WHERE id = ?
  `).bind(targetTicketId).run();

  // ── Forward to Admin LINE Group (non-blocking) ──
  // Look up user name for the notification
  let userName = "ไม่ระบุชื่อ";
  try {
    if (identity.type === 'rubber') {
      const ru = await db.prepare("SELECT name FROM rubber_users WHERE id = ?").bind(identity.id).first() as any;
      if (ru?.name) userName = ru.name;
    } else if (identity.type === 'store') {
      const st = await db.prepare("SELECT name FROM stores WHERE id = ?").bind(identity.id).first() as any;
      if (st?.name) userName = st.name;
    } else {
      const usr = await db.prepare("SELECT displayName FROM users WHERE id = ?").bind(identity.id).first() as any;
      if (usr?.displayName) userName = usr.displayName;
    }
  } catch (e) {}

  // Fire-and-forget: don't block the response
  notifyAdminLine({
    userName,
    userType: identity.type as any,
    ticketId: targetTicketId,
    message: message.trim(),
    isNewTicket,
  }, env).catch(err => console.error("[support-notify] background error:", err));

  return NextResponse.json({ success: true, ticketId: targetTicketId });
}
