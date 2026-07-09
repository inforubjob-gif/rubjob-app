import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/payment/slip
 * Customer uploads a payment slip when the main checkout system doesn't respond.
 * 
 * Priority order (designed to minimize user-facing errors):
 *   1. R2 upload (CRITICAL — fail = error to user)
 *   2. Order status update (CRITICAL — fail = error to user)  
 *   3. payment_logs insert (best-effort — fail = log only)
 *   4. Admin notifications (best-effort — fail = log only)
 *   5. LINE push (best-effort — fail = log only)
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderId = formData.get("orderId") as string;

    if (!file || !orderId) {
      return NextResponse.json({ error: "ต้องแนบไฟล์สลิปและ Order ID" }, { status: 400 });
    }

    const { env } = getRequestContext();
    const db = env?.DB;
    const bucket = env?.UPLOADS as any;

    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });
    if (!bucket) return NextResponse.json({ error: "R2 Bucket not found" }, { status: 500 });

    // Validate file type (images only)
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP)" }, { status: 400 });
    }

    // Validate size (5MB max for slip photos)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป (สูงสุด 5MB)" }, { status: 400 });
    }

    // Verify order exists and is not already paid
    const order = await db.prepare(
      "SELECT id, paymentStatus, totalPrice, userId FROM orders WHERE id = ?"
    ).bind(orderId).first() as { id: string; paymentStatus: string; totalPrice: number; userId: string } | null;

    if (!order) {
      return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json({ error: "ออเดอร์นี้ชำระเงินสำเร็จแล้ว", alreadyPaid: true }, { status: 400 });
    }

    // ════════════════════════════════════════════════════════
    // STEP 1 (CRITICAL): Upload slip to R2
    // ถ้าพังตรงนี้ = ส่ง error ให้ลูกค้า
    // ════════════════════════════════════════════════════════
    const ext = file.type.split("/")[1] || "jpg";
    const filename = `slips/slip-${orderId}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    await bucket.put(filename, arrayBuffer, {
      httpMetadata: { contentType: file.type }
    });

    const slipUrl = `/api/admin/files/${filename}`;

    // ════════════════════════════════════════════════════════
    // STEP 2 (CRITICAL): Update order status
    // ถ้าพังตรงนี้ = ส่ง error ให้ลูกค้า (แต่ภาพอยู่ใน R2 แล้ว)
    // ════════════════════════════════════════════════════════
    await db.prepare(`
      UPDATE orders 
      SET paymentStatus = 'slip_uploaded',
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(orderId).run();

    // ════════════════════════════════════════════════════════
    // ✅ ถึงตรงนี้ = สำเร็จ — ลูกค้าจะได้ success เสมอ
    //    ด้านล่างทั้งหมดเป็น best-effort ไม่กระทบลูกค้า
    // ════════════════════════════════════════════════════════
    console.log(`🧾 Slip uploaded for order ${orderId}: ${slipUrl}`);

    // STEP 3 (BEST-EFFORT): Save to payment_logs
    try {
      await db.prepare(
        `INSERT INTO payment_logs (id, orderId, gateway, chargeId, amount, status, webhookEvent, rawResponse) 
         VALUES (?, ?, 'manual_slip', ?, ?, 'slip_uploaded', 'customer_upload', ?)`
      ).bind(
        `SLIP-${orderId}-${Date.now()}`, orderId, `slip-${orderId}`, order.totalPrice,
        JSON.stringify({ slipUrl, uploadedAt: new Date().toISOString() })
      ).run();
    } catch (e) {
      console.error("Slip log error (non-critical):", e);
    }

    // STEP 4 (BEST-EFFORT): Notify admins via in-app notification
    try {
      const { createNotification } = await import("@/lib/notify-server");
      const { results: admins } = await db.prepare(
        "SELECT id FROM admin_users"
      ).all() as any;

      for (const admin of (admins || [])) {
        await createNotification(db, {
          userId: admin.id,
          userType: "customer" as any,
          type: "order_update",
          title: "🧾 ลูกค้าแนบสลิปชำระเงิน",
          message: `งาน #${orderId.slice(-6)} — ฿${order.totalPrice} ต้องยืนยันการชำระเงินด้วยตนเอง`,
          link: `/admin/orders/${orderId}`
        });
      }
    } catch (e) {
      console.error("Admin notification error (non-critical):", e);
    }

    // STEP 5 (BEST-EFFORT): LINE push to admin
    try {
      let adminLineToken = env.LINE_CHANNEL_ACCESS_TOKEN;
      if (!adminLineToken) {
        const setting = await db.prepare(
          "SELECT value FROM system_settings WHERE key = 'line_token_regular'"
        ).first() as any;
        if (setting?.value) adminLineToken = setting.value;
      }

      if (adminLineToken) {
        const adminSetting = await db.prepare(
          "SELECT value FROM system_settings WHERE key = 'admin_line_user_id'"
        ).first() as any;
        
        if (adminSetting?.value) {
          const { sendLinePush } = await import("@/lib/line");
          await sendLinePush(
            adminSetting.value,
            [{
              type: "text",
              text: `🧾 ลูกค้าแนบสลิปชำระเงิน\nงาน #${orderId.slice(-6)} — ฿${order.totalPrice}\nกรุณาตรวจสอบใน Admin Dashboard`
            }],
            adminLineToken
          ).catch((err: Error) => console.error("Admin LINE push error:", err));
        }
      }
    } catch (e) {
      console.error("LINE admin notification error (non-critical):", e);
    }

    return NextResponse.json({ 
      success: true, 
      slipUrl,
      message: "อัพโหลดสลิปสำเร็จ กำลังตรวจสอบการชำระเงิน"
    });
  } catch (error: unknown) {
    console.error("Slip upload error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
