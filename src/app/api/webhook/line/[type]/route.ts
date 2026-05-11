import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Unified LINE Webhook for all channels
 * Endpoint: /api/webhook/line/[type]
 * 
 * Auto-detects whether the sender is a Rubber, Store, or Customer
 * by cross-referencing LINE userId against:
 *   1. rubber_users.lineUserId → Rubber
 *   2. stores.lineUserId → Store
 *   3. users.id → Customer (LINE Login users)
 *   4. None → Unknown / Guest
 */
export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const db = getRequestContext().env.DB as any;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });
    
    // Create webhook_logs for debugging
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id TEXT PRIMARY KEY,
          channel TEXT,
          payload TEXT,
          error TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch(e) {}

    let channelType = (await params).type; // 'regular' or 'help'
    if (channelType === 'support') channelType = 'help'; // Normalize support to help
    
    const bodyText = await req.text();
    
    // Log the incoming request
    const logId = `LOG-${Date.now()}`;
    try {
      await db.prepare(`INSERT INTO webhook_logs (id, channel, payload) VALUES (?, ?, ?)`).bind(logId, channelType, bodyText).run();
    } catch(e) {}

    let body: any = {};
    try { body = JSON.parse(bodyText); } catch(e) {}
    
    const signature = req.headers.get("x-line-signature");

    // 1. Fetch Credentials from Database, fallback to ENV
    const channelKeySecret = `line_secret_${channelType}`;
    const channelKeyToken = `line_token_${channelType}`;
    const result = await db.prepare(`SELECT value FROM system_settings WHERE key = ?`).bind(channelKeySecret).first() as { value: string } | null;
    const channelSecret = result?.value || (getRequestContext().env as any)[`LINE_CHANNEL_SECRET_${channelType.toUpperCase()}`] || (getRequestContext().env as any).LINE_CHANNEL_SECRET;
    
    if (!channelSecret) {
      // No secret configured — still process message but skip signature verification
      console.warn(`LINE Secret not configured for channel: ${channelType} — skipping signature check`);
    }

    // 2. Verify Signature (Skip for manual in-app source)
    const isManual = body.manual_source === "in_app";
    
    if (!isManual && channelSecret) {
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

      if (channelSecret && hash !== signature) {
        try { await db.prepare(`UPDATE webhook_logs SET error = 'Signature mismatch' WHERE id = ?`).bind(logId).run(); } catch(e) {}
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // Self-healing: ensure columns exist
    try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN userType TEXT DEFAULT 'customer'").run(); } catch (e) {}
    try { await db.prepare("ALTER TABLE support_tickets ADD COLUMN senderName TEXT").run(); } catch (e) {}
    try { await db.prepare("ALTER TABLE rubber_users ADD COLUMN lineUserId TEXT").run(); } catch (e) {}
    try { await db.prepare("ALTER TABLE stores ADD COLUMN lineUserId TEXT").run(); } catch (e) {}

    const events = body.events || [];

    for (const event of events) {
      if (isManual || (event.type === "message" && ["text", "image", "sticker"].includes(event.message.type))) {
        const userId = isManual ? body.userId : event.source.userId;
        let text = "";
        
        if (isManual) {
          text = body.message;
        } else if (event.message.type === "text") {
          text = event.message.text;
        } else if (event.message.type === "image") {
          text = `[IMAGE:${event.message.id}]`;
        } else if (event.message.type === "sticker") {
          text = `[STICKER:${event.message.stickerId}]`;
        }

        const channelKey = isManual ? "in_app" : `${channelType}_line`;

        // ── Auto-detect User Type ──
        // Cross-reference LINE userId against rubber, store, and customer tables
        let userType = 'customer';
        let senderName = '';

        if (!isManual) {
          // Check all roles to support multi-role users
          const rubber = await db.prepare(
            `SELECT id, name FROM rubber_users WHERE lineUserId = ?`
          ).bind(userId).first() as any;

          const user = await db.prepare(
            `SELECT id, displayName FROM users WHERE id = ?`
          ).bind(userId).first() as any;

          if (rubber && user) {
            userType = 'both';
            senderName = rubber.name || user.displayName || '';
          } else if (rubber) {
            userType = 'rubber';
            senderName = rubber.name || '';
          } else if (user) {
            userType = 'customer';
            senderName = user.displayName || '';
          } else {
            // Check stores
            const store = await db.prepare(
              `SELECT id, name FROM stores WHERE lineUserId = ?`
            ).bind(userId).first() as any;
            if (store) {
              userType = 'store';
              senderName = store.name || '';
            } else {
              userType = 'unknown';
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
          const subjectPrefix = userType === 'both' ? '👤🏍️ Both' : userType === 'rubber' ? '🏍️ Rubber' : userType === 'store' ? '🏪 Store' : '👤 Customer';
          
          // Ensure userId exists in users table (FK constraint)
          try {
            await db.prepare(`INSERT OR IGNORE INTO users (id, role, displayName) VALUES (?, ?, ?)`) 
              .bind(userId, userType === 'rubber' ? 'driver' : 'user', senderName || 'LINE User').run();
          } catch (e) {}
          
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
    try {
      const db = getRequestContext().env.DB as any;
      if (db) {
        await db.prepare(`UPDATE webhook_logs SET error = ? WHERE id = (SELECT id FROM webhook_logs ORDER BY createdAt DESC LIMIT 1)`).bind(error.stack || error.message).run();
      }
    } catch(e) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getUserTypeStyle(type: string) {
  switch (type) {
    case 'rubber':
      return { label: 'RUBBER', icon: '🏍️', badgeClass: 'bg-blue-50 text-blue-600 ring-blue-200', dotClass: 'bg-blue-500' };
    case 'store':
      return { label: 'STORE', icon: '🏪', badgeClass: 'bg-purple-50 text-purple-600 ring-purple-200', dotClass: 'bg-purple-500' };
    case 'both':
      return { label: 'BOTH', icon: '👤🏍️', badgeClass: 'bg-amber-50 text-amber-600 ring-amber-200', dotClass: 'bg-amber-500' };
    default:
      return { label: 'CUSTOMER', icon: '👤', badgeClass: 'bg-emerald-50 text-emerald-600 ring-emerald-200', dotClass: 'bg-emerald-500' };
  }
}
