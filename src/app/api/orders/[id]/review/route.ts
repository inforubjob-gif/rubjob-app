import { safeError } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * POST /api/orders/[id]/review
 * Submit a rating and review for a completed order
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { storeRating, storeReview, driverRating, driverReview } = await req.json() as any;

    if (!storeRating && !driverRating) {
      return NextResponse.json({ error: "No ratings provided" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;

    // We no longer need the fallback ALTER TABLEs because we added them in db-init.ts.
    let updateFields = [];
    const paramsArray: any[] = [];
    
    // Calculate average rating for backward compatibility
    let totalScore = 0;
    let totalCount = 0;
    
    if (storeRating) {
       updateFields.push("storeRating = ?", "storeReview = ?");
       paramsArray.push(storeRating, storeReview || null);
       totalScore += Number(storeRating);
       totalCount++;
    }
    if (driverRating) {
       updateFields.push("driverRating = ?", "driverReview = ?");
       paramsArray.push(driverRating, driverReview || null);
       totalScore += Number(driverRating);
       totalCount++;
    }
    
    const avgRating = totalCount > 0 ? Math.round(totalScore / totalCount) : null;
    const combinedReviewText = `[Store: ${storeReview || '-'}] [Driver: ${driverReview || '-'}]`;

    updateFields.push("rating = ?", "review_text = ?");
    paramsArray.push(avgRating, combinedReviewText);
    
    const query = `UPDATE orders SET ${updateFields.join(", ")} WHERE id = ? AND status = 'completed'`;
    paramsArray.push(id);

    const result = await db.prepare(query).bind(...paramsArray).run();

    if (result.meta.changes === 0) {
      return NextResponse.json(
        { error: "Order not found or not in completed status" },
        { status: 404 }
      )
    }

    // ─── Fetch Order Info for Notifications ───
    const orderData = await db.prepare(`
      SELECT o.userId, u.displayName as customerName, o.storeId, o.deliveryDriverId,
             st.ownerId as storeOwnerId
      FROM orders o 
      LEFT JOIN users u ON o.userId = u.id 
      LEFT JOIN stores st ON o.storeId = st.id
      WHERE o.id = ?
    `).bind(id).first() as any;
    
    // ─── Notify Driver via internal notification (and possibly LINE) ───
    if (driverRating && orderData?.deliveryDriverId) {
      try {
        await db.prepare(`
          INSERT INTO support_tickets (id, userId, userType, status, subject, updatedAt)
          VALUES (?, ?, 'driver', 'open', 'รีวิวจากลูกค้า', CURRENT_TIMESTAMP)
        `).bind(`REV-DRV-${id.slice(-6)}`, orderData.deliveryDriverId).run();
        
        await db.prepare(`
          INSERT INTO support_messages (id, ticketId, content, senderType, createdAt)
          VALUES (?, ?, ?, 'system', CURRENT_TIMESTAMP)
        `).bind(`MSG-DRV-${id.slice(-6)}`, `REV-DRV-${id.slice(-6)}`, `ลูกค้าให้คะแนนคุณ ${driverRating} ดาว: ${driverReview || 'ไม่มีคอมเมนต์'}`).run();
      } catch (e) {
        console.error("Failed to notify driver", e);
      }
    }

    // ─── Notify Store via internal notification ───
    if (storeRating && orderData?.storeOwnerId) {
      try {
        await db.prepare(`
          INSERT INTO support_tickets (id, userId, userType, status, subject, updatedAt)
          VALUES (?, ?, 'partner', 'open', 'รีวิวจากลูกค้า', CURRENT_TIMESTAMP)
        `).bind(`REV-STR-${id.slice(-6)}`, orderData.storeOwnerId).run();
        
        await db.prepare(`
          INSERT INTO support_messages (id, ticketId, content, senderType, createdAt)
          VALUES (?, ?, ?, 'system', CURRENT_TIMESTAMP)
        `).bind(`MSG-STR-${id.slice(-6)}`, `REV-STR-${id.slice(-6)}`, `ลูกค้ารีวิวร้านซักของคุณ ${storeRating} ดาว: ${storeReview || 'ไม่มีคอมเมนต์'}`).run();
      } catch (e) {
        console.error("Failed to notify store", e);
      }
    }

    // ─── Escalation Logic (Integrated with existing Support Chat) ───
    if (avgRating !== null && avgRating <= 3 || (combinedReviewText && combinedReviewText.trim().length > 0)) {
      if (orderData?.userId) {
        const ticketId = `SUP-REV-${id.slice(-6).toUpperCase()}`;
        const messageId = `MSG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const content = `[Review ${avgRating} Stars] ${combinedReviewText || "No comment"}`;

        await db.prepare(`
          INSERT INTO support_tickets (id, userId, userType, status, updatedAt)
          VALUES (?, ?, 'customer', 'open', CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET status = 'open', updatedAt = CURRENT_TIMESTAMP
        `).bind(ticketId, orderData.userId).run();

        await db.prepare(`
          INSERT INTO support_messages (id, ticketId, content, senderType, createdAt)
          VALUES (?, ?, ?, 'user', CURRENT_TIMESTAMP)
        `).bind(messageId, ticketId, content).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Submit review error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
