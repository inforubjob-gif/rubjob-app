import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * POST /api/admin/support/reply
 * Admin replies to a ticket (sends LINE push message)
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { ticketId, text, adminName } = (await req.json() as any) as { ticketId: string; text: string; adminName: string };
    
    if (!ticketId || !text) {
      return NextResponse.json({ error: "Ticket ID and Text required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    const env = getRequestContext().env as any;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Fetch Ticket details to know the channel and userId
    const ticket = await db.prepare(`
      SELECT userId, channel FROM support_tickets WHERE id = ?
    `).bind(ticketId).first() as any;

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // 2. Send Push Message to LINE if it's a LINE channel (skip for in_app)
    if (ticket.channel.includes('line')) {
      const channelKeyToken = `line_token_${ticket.channel.replace('_line', '')}`;
      const result = await db.prepare(`SELECT value FROM system_settings WHERE key = ?`).bind(channelKeyToken).first() as { value: string };
      const channelToken = result?.value;

      if (channelToken) {
        const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${channelToken}`,
          },
          body: JSON.stringify({
            to: ticket.userId,
            messages: [{ type: "text", text: text }],
          }),
        });

        if (!lineRes.ok) {
          const err = await lineRes.text();
          console.error("LINE Push Error:", err);
          // Don't fail — still save message to DB
        }
      }
    }

    // 4. Save message to database
    const messageId = `MSG-ADM-${Date.now()}`;
    await db.prepare(`
      INSERT INTO support_messages (id, ticketId, senderType, senderId, content)
      VALUES (?, ?, 'admin', ?, ?)
    `).bind(messageId, ticketId, adminName || "Admin", text).run();

    // 5. Update Ticket updatedAt
    await db.prepare(`
      UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(ticketId).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reply error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
