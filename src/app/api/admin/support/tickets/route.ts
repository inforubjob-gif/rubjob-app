import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * GET /api/admin/support/tickets
 * List tickets or get specific ticket messages
 */
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id"); // Ticket ID
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: ensure userType column exists
    try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN userType TEXT DEFAULT 'customer'").run(); } catch (e) {}

    if (id) {
      // Fetch messages for a specific ticket
      const { results } = await db.prepare(`
        SELECT * FROM support_messages 
        WHERE ticketId = ? 
        ORDER BY createdAt ASC
      `).bind(id).all();
      return NextResponse.json({ messages: results });
    }

    // List all tickets with the latest message snippet
    const { results } = await db.prepare(`
      SELECT 
        t.*, 
        u.displayName as userName, 
        u.pictureUrl as userPicture,
        r.name as riderName,
        s.name as storeName,
        (SELECT content FROM support_messages WHERE ticketId = t.id ORDER BY createdAt DESC LIMIT 1) as lastMessage,
        (SELECT createdAt FROM support_messages WHERE ticketId = t.id ORDER BY createdAt DESC LIMIT 1) as lastMessageAt
      FROM support_tickets t
      LEFT JOIN users u ON t.userId = u.id AND (t.userType = 'customer' OR t.userType IS NULL)
      LEFT JOIN rider_users r ON t.userId = r.id AND t.userType = 'rider'
      LEFT JOIN stores s ON t.userId = s.id AND t.userType = 'store'
      ORDER BY lastMessageAt DESC NULLS LAST, t.updatedAt DESC
    `).all();

    // Normalize names
    const normalizedTickets = results.map((t: any) => ({
      ...t,
      userName: t.userName || t.riderName || t.storeName || "Unknown",
      userPicture: t.userPicture || null,
    }));

    return NextResponse.json({ tickets: normalizedTickets });
  } catch (error: any) {
    console.error("Admin tickets fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/support/tickets
 * Update ticket status (Resolved, Closed, etc.)
 */
export async function PATCH(req: Request) {
  try {
    const { id, status } = (await req.json()) as { id: string; status: string };
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`
      UPDATE support_tickets SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(status, id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
