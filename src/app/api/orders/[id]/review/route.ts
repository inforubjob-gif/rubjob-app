import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * POST /api/orders/[id]/review
 * Submit a rating and review for a completed order
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { rating, reviewText } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;

    // Update order with rating and review
    const result = await db
      .prepare(
        "UPDATE Orders SET rating = ?, review_text = ? WHERE id = ? AND status = 'COMPLETED'"
      )
      .bind(rating, reviewText, id)
      .run();

    if (result.meta.changes === 0) {
      return NextResponse.json(
        { error: "Order not found or not in COMPLETED status" },
        { status: 404 }
      )
    }

    // ─── Escalation Logic (Integrated with existing Support Chat) ───
    if (rating <= 3 || (reviewText && reviewText.trim().length > 0)) {
      // Get customer info
      const orderData = await db.prepare(`
        SELECT o.customer_id, u.name as customerName 
        FROM Orders o 
        JOIN Users u ON o.customer_id = u.id 
        WHERE o.id = ?
      `).bind(id).first() as any;
      
      if (orderData?.customer_id) {
        const ticketId = `SUP-REV-${id.slice(-6).toUpperCase()}`;
        const messageId = `MSG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const content = `[Review ${rating} Stars] ${reviewText || "No comment"}`;

        // 1. Create or Update Support Ticket
        await db.prepare(`
          INSERT INTO support_tickets (id, userId, userType, status, updatedAt, senderName)
          VALUES (?, ?, 'customer', 'open', CURRENT_TIMESTAMP, ?)
          ON CONFLICT(id) DO UPDATE SET status = 'open', updatedAt = CURRENT_TIMESTAMP
        `).bind(ticketId, orderData.customer_id, orderData.customerName || "Customer").run();

        // 2. Insert the review as the first message
        await db.prepare(`
          INSERT INTO support_messages (id, ticketId, content, senderType, createdAt)
          VALUES (?, ?, ?, 'user', CURRENT_TIMESTAMP)
        `).bind(messageId, ticketId, content).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Submit review error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
