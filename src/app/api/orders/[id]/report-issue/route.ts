import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * Resolve the caller identity from cookies.
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
 * POST /api/orders/[id]/report-issue
 * Create a support ticket linked to an order.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id: orderId } = params;
  const identity = await resolveIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getRequestContext().env.DB;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  const body = await req.json() as { type: string; message: string };
  const { type, message } = body;

  if (!type) return NextResponse.json({ error: "Issue type required" }, { status: 400 });

  try {
    // 1. Create a new support ticket
    const ticketId = `TKT-ISSUE-${orderId.slice(-4)}-${Date.now()}`;
    const subject = `[ORDER ISSUE] #${orderId.slice(-6)} - ${type}`;
    
    // Determine user ID in 'users' table
    let userIdInTable = identity.id;
    if (identity.type === "store") {
        // For store, we should link to the ownerId (user ID)
        const store = await db.prepare("SELECT ownerId FROM stores WHERE id = ?").bind(identity.id).first() as any;
        if (store?.ownerId) userIdInTable = store.ownerId;
    }

    await db.prepare(`
      INSERT INTO support_tickets (id, userId, orderId, channel, status, subject, userType)
      VALUES (?, ?, ?, 'in_app', 'open', ?, ?)
    `).bind(ticketId, userIdInTable, orderId, subject, identity.type).run();

    // 2. Insert initial message
    const msgId = `MSG-${Date.now()}`;
    const fullContent = `[Issue Type: ${type}]\n\n${message || "No additional details provided."}`;
    
    await db.prepare(`
      INSERT INTO support_messages (id, ticketId, senderType, senderId, content)
      VALUES (?, ?, ?, ?, ?)
    `).bind(msgId, ticketId, identity.type, identity.id, fullContent).run();

    return NextResponse.json({ success: true, ticketId });
  } catch (error: any) {
    console.error("Report issue error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
