import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * Resolve the caller identity from cookies.
 * Returns { id, type } where type is 'rider' | 'store'.
 */
async function resolveIdentity(): Promise<{ id: string; type: string } | null> {
  const cookieStore = await cookies();
  const riderToken = cookieStore.get("rider_token")?.value;
  if (riderToken) return { id: riderToken, type: "rider" };
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
  try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN userType TEXT DEFAULT 'customer'").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN orderId TEXT").run(); } catch (e) {}

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
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  // Self-healing
  try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN userType TEXT DEFAULT 'customer'").run(); } catch (e) {}
  try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN orderId TEXT").run(); } catch (e) {}

  const body = await req.json() as { subject?: string; ticketId?: string; message: string };
  const { subject, ticketId, message } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  let targetTicketId = ticketId;

  if (!targetTicketId) {
    // Create new ticket
    const newId = `TKT-${identity.type.toUpperCase()}-${Date.now()}`;
    await db.prepare(`
      INSERT INTO support_tickets (id, userId, channel, status, subject, userType)
      VALUES (?, ?, 'in_app', 'open', ?, ?)
    `).bind(newId, identity.id, subject || "ติดต่อแอดมิน", identity.type).run();
    targetTicketId = newId;
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

  return NextResponse.json({ success: true, ticketId: targetTicketId });
}
