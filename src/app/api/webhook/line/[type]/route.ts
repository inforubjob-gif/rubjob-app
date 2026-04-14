import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Unified LINE Webhook for Regular and Help channels
 * Endpoint: /api/webhook/line/[type]
 */
export async function POST(req: Request, { params }: { params: { type: string } }) {
  try {
    const db = getRequestContext().env.DB as any;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });
    
    const channelType = params.type; // 'regular' or 'help'
    const bodyText = await req.text();
    let body: any = {};
    try { body = JSON.parse(bodyText); } catch(e) {}
    
    const signature = req.headers.get("x-line-signature");

    // 1. Fetch Credentials from Database instead of ENV
    const channelKeySecret = `line_secret_${channelType}`;
    const result = await db.prepare(`SELECT value FROM system_settings WHERE key = ?`).bind(channelKeySecret).first() as { value: string };
    const channelSecret = result?.value;
    
    if (!channelSecret) {
      console.error(`Missing LINE Secret in DB for channel: ${channelType}`);
      // If not in DB, fallback to ENV for migration period if needed, or just error
      return NextResponse.json({ error: "LINE configuration missing in settings" }, { status: 500 });
    }

    // 2. Verify Signature (Skip for manual in-app source)
    const isManual = body.manual_source === "in_app";
    
    if (!isManual) {
      if (!signature) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(channelSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const hashBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = btoa(String.fromCharCode(...hashArray));

      if (hash !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const events = body.events || [];

    for (const event of events) {
      if (isManual || (event.type === "message" && event.message.type === "text")) {
        const userId = isManual ? body.userId : event.source.userId;
        const text = isManual ? body.message : event.message.text;
        const channelKey = isManual ? "in_app" : `${channelType}_line`;

        // 3. Find or Create Active Ticket
        // We look for 'open' or 'pending' tickets for this user on this channel
        let ticket = await db.prepare(`
          SELECT id FROM support_tickets 
          WHERE userId = ? AND channel = ? AND status IN ('open', 'pending')
          LIMIT 1
        `).bind(userId, channelKey).first() as any;

        let ticketId = ticket?.id;

        if (!ticketId) {
          ticketId = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await db.prepare(`
            INSERT INTO support_tickets (id, userId, channel, subject, status)
            VALUES (?, ?, ?, ?, 'open')
          `).bind(ticketId, userId, channelKey, `Chat from ${channelType} LINE`).run();
        }

        // 4. Save Message
        const messageId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await db.prepare(`
          INSERT INTO support_messages (id, ticketId, senderType, senderId, content)
          VALUES (?, ?, 'user', ?, ?)
        `).bind(messageId, ticketId, userId, text).run();

        // 5. Update Ticket's updatedAt
        await db.prepare(`
          UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(ticketId).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
