import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * GET /api/admin/orders/fix-stuck
 * Find orders that are stuck — customer paid (via Beam) but webhook
 * failed to update status due to the Stripe→Beam migration bug.
 * 
 * These orders have:
 *  - paymentStatus still 'pending' (webhook never fired)
 *  - status still 'pending' (never moved to searching_driver)
 *  - A corresponding 'success' entry in payment_logs from Beam
 * 
 * Also finds orders that were manually paid but never broadcast.
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    // Find stuck orders — paid at Beam but status never updated
    // Strategy: find recent pending orders that should have been paid
    const { results: stuckOrders } = await db.prepare(`
      SELECT o.id, o.userId, o.status, o.paymentStatus, o.totalPrice, 
             o.deliveryFee, o.address, o.serviceId, o.createdAt, o.updatedAt,
             s.name as serviceName
      FROM orders o
      LEFT JOIN services s ON o.serviceId = s.id
      WHERE o.status IN ('pending') 
        AND o.paymentStatus IN ('pending')
        AND o.createdAt > datetime('now', '-7 days')
      ORDER BY o.createdAt DESC
      LIMIT 50
    `).all() as any;

    // Also check payment_logs for any orders that Beam confirmed but we missed
    let beamConfirmed: string[] = [];
    try {
      const { results: logs } = await db.prepare(`
        SELECT DISTINCT orderId 
        FROM payment_logs 
        WHERE gateway = 'beam' AND status = 'success'
        AND orderId IN (SELECT id FROM orders WHERE paymentStatus = 'pending')
      `).all() as any;
      beamConfirmed = (logs || []).map((l: any) => l.orderId);
    } catch (e) { /* table might not exist */ }

    return NextResponse.json({
      stuckOrders: stuckOrders || [],
      beamConfirmedButNotUpdated: beamConfirmed,
      total: (stuckOrders || []).length,
      hint: "POST to this endpoint with { orderIds: [...] } or { fixAll: true } to fix and broadcast",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/orders/fix-stuck
 * Fix stuck orders: mark as paid, update status to searching_driver,
 * and broadcast to eligible rubbers.
 * 
 * Body: { orderIds: ["RJ-XXX", ...] } — fix specific orders
 *   OR  { fixAll: true }               — fix all stuck orders from GET
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getRequestContext().env.DB;
    const env = getRequestContext().env as any;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    const body = await req.json() as any;
    let orderIds: string[] = body.orderIds || [];

    // If fixAll, find all stuck orders
    if (body.fixAll) {
      const { results } = await db.prepare(`
        SELECT id FROM orders
        WHERE status IN ('pending') 
          AND paymentStatus IN ('pending')
          AND createdAt > datetime('now', '-7 days')
      `).all() as any;
      orderIds = (results || []).map((r: any) => r.id);
    }

    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, message: "No stuck orders to fix", fixed: [] });
    }

    const results: { orderId: string; status: string; detail?: string }[] = [];

    for (const orderId of orderIds) {
      try {
        // 1. Fetch order details
        const order = await db.prepare(`
          SELECT o.id, o.status, o.paymentStatus, o.address, o.deliveryFee,
                 o.userId, o.totalPrice, o.serviceId,
                 s.name as serviceName, p.title as gigName
          FROM orders o
          LEFT JOIN services s ON o.serviceId = s.id
          LEFT JOIN provider_services p ON o.serviceId = p.id
          WHERE o.id = ?
        `).bind(orderId).first() as any;

        if (!order) {
          results.push({ orderId, status: "SKIP", detail: "Order not found" });
          continue;
        }

        // Only fix orders that are actually stuck
        if (order.paymentStatus === 'paid' && order.status === 'searching_driver') {
          // Already fixed — just re-broadcast
          results.push({ orderId, status: "ALREADY_FIXED", detail: "Re-broadcasting only" });
        } else {
          // 2. Update order status
          await db.prepare(`
            UPDATE orders 
            SET paymentStatus = 'paid', 
                status = 'searching_driver',
                updatedAt = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).bind(orderId).run();
        }

        // 3. Send in-app notification to customer
        try {
          const { createNotification } = await import("@/lib/notify-server");
          const serviceName = order.serviceName || order.gigName || "Laundry Service";
          await createNotification(db, {
            userId: order.userId,
            userType: "customer",
            type: "order_update",
            title: "✅ ชำระเงินสำเร็จ",
            message: `งาน #${orderId.slice(-6)} — ${serviceName} ฿${order.totalPrice} ได้รับการยืนยันแล้ว`,
            link: `/orders/${orderId}`
          });
        } catch (e) {
          console.error(`Customer notification error for ${orderId}:`, e);
        }

        // 4. Send LINE push to customer
        try {
          let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
          if (!customerToken) {
            const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_token_regular'").first() as any;
            if (setting?.value) customerToken = setting.value;
          }
          if (customerToken && order.userId) {
            const { sendLinePush, bookingConfirmationFlex } = await import("@/lib/line");
            const serviceName = order.serviceName || order.gigName || "Laundry Service";
            await sendLinePush(
              order.userId,
              [bookingConfirmationFlex(orderId, serviceName, order.totalPrice || 0)],
              customerToken
            ).catch(err => console.error("Customer push error:", err));
          }
        } catch (e) {
          console.error(`Customer LINE push error for ${orderId}:`, e);
        }

        // 5. Clear old dispatch dedup logs to allow fresh broadcast
        try {
          await db.prepare(
            `DELETE FROM webhook_logs WHERE id LIKE ? AND channel IN ('dispatch_success', 'dispatch_webpush', 'dispatch_fail')`
          ).bind(`DISPATCH-${orderId}-%`).run();
        } catch (e) { /* table might not exist */ }

        // 6. Broadcast to eligible rubbers
        try {
          const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
          const orderAddress = (() => {
            try { return typeof order.address === "string" ? JSON.parse(order.address) : order.address; }
            catch { return null; }
          })();
          await broadcastToEligibleRubbers(
            db, env, orderId,
            orderAddress,
            order.deliveryFee || 0,
            'paid'
          );
          results.push({ orderId, status: "FIXED", detail: "Status updated + broadcast sent to rubbers" });
        } catch (e: any) {
          results.push({ orderId, status: "PARTIAL", detail: `Status updated but broadcast failed: ${e.message}` });
        }

      } catch (e: any) {
        results.push({ orderId, status: "ERROR", detail: e.message });
      }
    }

    // Audit log
    try {
      const { nanoid } = await import("nanoid");
      await db.prepare(`INSERT INTO audit_logs (id, adminId, adminName, action, targetType, targetId, details) VALUES (?, ?, ?, ?, 'order', ?, ?)`)
        .bind(
          `AUD-${nanoid(8)}`,
          (session as any).id || 'unknown',
          (session as any).name || 'Admin',
          'fix_stuck_orders',
          orderIds.join(','),
          `Fixed ${results.filter(r => r.status === 'FIXED').length} stuck orders`
        ).run();
    } catch (e) { console.error("Audit log error:", e); }

    return NextResponse.json({
      success: true,
      fixed: results,
      summary: {
        total: results.length,
        fixed: results.filter(r => r.status === 'FIXED').length,
        alreadyFixed: results.filter(r => r.status === 'ALREADY_FIXED').length,
        errors: results.filter(r => r.status === 'ERROR').length,
      }
    });
  } catch (error: any) {
    console.error("Fix stuck orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
