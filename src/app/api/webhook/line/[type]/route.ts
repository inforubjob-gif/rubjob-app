import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Unified LINE Webhook for all channels
 * Endpoint: /api/webhook/line/[type]
 * 
 * Auto-detects whether the sender is a Rider, Store, or Customer
 * by cross-referencing LINE userId against:
 *   1. rider_users.lineUserId → Rider
 *   2. stores.lineUserId → Store
 *   3. users.id → Customer (LINE Login users)
 *   4. None → Unknown / Guest
 */
export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const db = getRequestContext().env.DB as any;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });
    
    const channelType = (await params).type; // 'regular' or 'help'
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

    // Self-healing: ensure columns exist
    try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN userType TEXT DEFAULT 'customer'").run(); } catch (e) {}
    try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN senderName TEXT").run(); } catch (e) {}

    const events = body.events || [];

    for (const event of events) {
      if (isManual || (event.type === "message" && event.message.type === "text")) {
        const userId = isManual ? body.userId : event.source.userId;
        const text = isManual ? body.message : event.message.text;
        const channelKey = isManual ? "in_app" : `${channelType}_line`;

        // ── Auto-detect User Type ──
        // Cross-reference LINE userId against rider, store, and customer tables
        let userType = 'customer';
        let senderName = '';

        if (!isManual) {
          // Check rider_users first
          const rider = await db.prepare(
            `SELECT id, name FROM rider_users WHERE lineUserId = ?`
          ).bind(userId).first() as any;

          if (rider) {
            userType = 'rider';
            senderName = rider.name || '';
          } else {
            // Check stores
            const store = await db.prepare(
              `SELECT id, name FROM stores WHERE lineUserId = ?`
            ).bind(userId).first() as any;

            if (store) {
              userType = 'store';
              senderName = store.name || '';
            } else {
              // Check regular users (LINE Login)
              const user = await db.prepare(
                `SELECT id, displayName FROM users WHERE id = ?`
              ).bind(userId).first() as any;

              if (user) {
                userType = 'customer';
                senderName = user.displayName || '';
              } else {
                userType = 'unknown';
                senderName = '';
              }
            }
          }
        }

        // 3. Find or Create Active Ticket
        let ticket = await db.prepare(`
          SELECT id FROM support_tickets 
          WHERE userId = ? AND channel = ? AND status IN ('open', 'pending')
          LIMIT 1
        `).bind(userId, channelKey).first() as any;

        let ticketId = ticket?.id;

        if (!ticketId) {
          ticketId = `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const subjectPrefix = userType === 'rider' ? '🏍️ Rider' : userType === 'store' ? '🏪 Store' : '👤 Customer';
          await db.prepare(`
            INSERT INTO support_tickets (id, userId, channel, subject, status, userType, senderName)
            VALUES (?, ?, ?, ?, 'open', ?, ?)
          `).bind(
            ticketId, userId, channelKey, 
            `${subjectPrefix} — Chat from LINE`,
            userType, senderName
          ).run();
        }

        // 4. Save Message
        const messageId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await db.prepare(`
          INSERT INTO support_messages (id, ticketId, senderType, senderId, content)
          VALUES (?, ?, ?, ?, ?)
        `).bind(messageId, ticketId, userType === 'unknown' ? 'user' : userType, userId, text).run();

        // 5. Update Ticket's updatedAt and senderName (in case it changed)
        await db.prepare(`
          UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP, senderName = COALESCE(?, senderName) WHERE id = ?
        `).bind(senderName || null, ticketId).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
