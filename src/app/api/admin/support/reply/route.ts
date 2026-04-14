import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/admin/support/reply
 * Admin replies to a ticket (sends LINE push message)
 */
export async function POST(req: Request) {
  try {
    const { ticketId, text, adminName } = (await req.json()) as { ticketId: string; text: string; adminName: string };
    
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

    // 2. Determine which token to use
    let channelToken = "";
    if (ticket.channel === "regular_line") channelToken = env.LINE_TOKEN_REGULAR;
    else if (ticket.channel === "help_line") channelToken = env.LINE_TOKEN_HELP;

    // 3. Send Push Message to LINE if it's a LINE channel
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
        return NextResponse.json({ error: "Failed to send message to LINE", details: err }, { status: 502 });
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
