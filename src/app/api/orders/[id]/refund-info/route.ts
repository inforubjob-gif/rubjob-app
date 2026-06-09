import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/orders/[id]/refund-info
 * Customer submits bank account info for refund
 * Body: { bankName, accountNumber, accountName }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { bankName, accountNumber, accountName } = await req.json() as any;

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลธนาคารให้ครบถ้วน" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Find the order and its associated payout request
    const order = await db.prepare("SELECT userId, totalPrice FROM orders WHERE id = ?").bind(orderId).first() as any;
    if (!order) {
      return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
    }

    // Find the awaiting_info payout request for this order
    const payout = await db.prepare(`
      SELECT id, amount FROM payout_requests 
      WHERE requesterId = ? AND requesterType = 'customer_refund' AND status = 'awaiting_info' AND notes LIKE ?
      ORDER BY createdAt DESC LIMIT 1
    `).bind(order.userId, `%${orderId}%`).first() as any;

    if (!payout) {
      return NextResponse.json({ error: "ไม่พบรายการคืนเงินที่รอข้อมูล หรือคุณอาจส่งข้อมูลไปแล้ว" }, { status: 404 });
    }

    // Update the payout request with bank info and change status to pending
    await db.prepare(`
      UPDATE payout_requests 
      SET bankName = ?, accountNumber = ?, accountName = ?, status = 'pending'
      WHERE id = ?
    `).bind(bankName, accountNumber, accountName, payout.id).run();

    // Send LINE confirmation to customer
    try {
      const { sendLinePush, refundInfoReceivedFlex } = await import("@/lib/line");
      const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
      if (accessToken) {
        await sendLinePush(order.userId, [refundInfoReceivedFlex(orderId, payout.amount)], accessToken);
      }
    } catch (lineErr) {
      console.error("Failed to send refund confirmation LINE:", lineErr);
    }

    return NextResponse.json({ success: true, message: "ส่งข้อมูลบัญชีเรียบร้อยแล้ว เราจะคืนเงินภายใน 1 วันทำการ" });
  } catch (error: unknown) {
    console.error("Refund info submission error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
