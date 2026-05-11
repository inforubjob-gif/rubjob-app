import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/debug/dispatch?orderId=xxx
 * 🔍 Debug endpoint to check why rubber notifications are not being sent.
 * Shows: order data, rubber list, eligibility, LINE token status, and attempts a test dispatch.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ error: "DB not found" }, { status: 500 });
    }

    const report: any = {
      timestamp: new Date().toISOString(),
      orderId,
      checks: {},
    };

    // 1. Check Order
    if (orderId) {
      const order = await db.prepare(
        "SELECT id, status, paymentStatus, userId, totalPrice, serviceId, address, deliveryFee, updatedAt FROM orders WHERE id = ?"
      ).bind(orderId).first() as any;
      report.checks.order = order || "NOT FOUND";
      
      if (order?.address) {
        try {
          report.checks.parsedAddress = typeof order.address === 'string' ? JSON.parse(order.address) : order.address;
        } catch {
          report.checks.parsedAddress = "PARSE_ERROR: " + order.address;
        }
      }
    }

    // 2. Check ALL rubbers
    const { results: allRubbers } = await db.prepare(
      "SELECT id, name, lineUserId, preferences, address, phone FROM rubber_users"
    ).all() as any;
    
    report.checks.totalRubbers = allRubbers?.length || 0;
    report.checks.rubberDetails = (allRubbers || []).map((r: any) => {
      let prefs: any = {};
      try { prefs = JSON.parse(r.preferences || "{}"); } catch {}
      return {
        id: r.id,
        name: r.name,
        lineUserId: r.lineUserId || "NONE",
        phone: r.phone || "NONE",
        workStatus: prefs.workStatus ?? "NOT_SET",
        address: r.address || "NONE",
      };
    });

    // 3. Check Eligible Rubbers (geo-filtered)
    if (orderId && report.checks.order?.address) {
      const { getEligibleRubbers } = await import("@/lib/dispatch");
      const eligible = await getEligibleRubbers(db, report.checks.order.address);
      report.checks.eligibleRubbers = eligible.map(r => ({
        id: r.id,
        lineUserId: r.lineUserId || "NONE",
      }));
      report.checks.eligibleCount = eligible.length;
    }

    // 4. Check LINE tokens (mirrors dispatch.ts logic)
    const tokenChecks: any = {};
    
    // Step 1: Dedicated rubber token from env
    let resolvedRubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
    tokenChecks.step1_envRubberToken = resolvedRubberToken ? `SET (${resolvedRubberToken.length} chars)` : "NOT_SET";
    
    // Step 2: Dedicated rubber token from DB
    if (!resolvedRubberToken) {
      const setting = await db.prepare(
        "SELECT value FROM system_settings WHERE key = 'line_channel_access_token_rubber'"
      ).first() as any;
      tokenChecks.step2_dbRubberToken = setting?.value ? `SET (${setting.value.length} chars)` : "NOT_SET";
      if (setting?.value) resolvedRubberToken = setting.value;
    }

    // Step 3: Fallback to customer env token
    if (!resolvedRubberToken) {
      resolvedRubberToken = env.LINE_CHANNEL_ACCESS_TOKEN;
      tokenChecks.step3_envCustomerTokenFallback = resolvedRubberToken ? `USING THIS (${resolvedRubberToken.length} chars)` : "NOT_SET";
    }
    
    // Step 4: Fallback to customer DB token
    if (!resolvedRubberToken) {
      const setting = await db.prepare(
        "SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'"
      ).first() as any;
      tokenChecks.step4_dbCustomerTokenFallback = setting?.value ? `USING THIS (${setting.value.length} chars)` : "NOT_SET";
      if (setting?.value) resolvedRubberToken = setting.value;
    }

    tokenChecks.finalRubberToken = resolvedRubberToken ? `AVAILABLE (${resolvedRubberToken.length} chars)` : "MISSING — NO TOKEN FOUND ANYWHERE";
    
    // Admin group
    tokenChecks.adminGroupId = env.LINE_ADMIN_GROUP_ID ? `SET (${env.LINE_ADMIN_GROUP_ID})` : "NOT_SET";
    
    report.checks.lineTokens = tokenChecks;

    // 5. Check notifications table
    try {
      const { results: recentNotifs } = await db.prepare(
        "SELECT id, userId, userType, type, title, message, createdAt FROM notifications ORDER BY createdAt DESC LIMIT 10"
      ).all() as any;
      report.checks.recentNotifications = recentNotifs || [];
    } catch (e: any) {
      report.checks.recentNotifications = `ERROR: ${e.message}`;
    }

    // 6. Check system_settings for all LINE keys
    try {
      const { results: settings } = await db.prepare(
        "SELECT key, CASE WHEN value IS NOT NULL AND value != '' THEN 'SET (' || LENGTH(value) || ' chars)' ELSE 'EMPTY' END as status FROM system_settings WHERE key LIKE '%line%' OR key LIKE '%stripe%'"
      ).all() as any;
      report.checks.systemSettings = settings || [];
    } catch (e: any) {
      report.checks.systemSettings = `ERROR: ${e.message}`;
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

/**
 * POST /api/debug/dispatch
 * 🧪 Test dispatch: manually trigger the broadcast for an existing order.
 */
export async function POST(req: Request) {
  try {
    const { orderId } = (await req.json()) as { orderId: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) {
      return NextResponse.json({ error: "DB not found" }, { status: 500 });
    }

    const order = await db.prepare(
      "SELECT id, status, paymentStatus, userId, totalPrice, serviceId, address, deliveryFee FROM orders WHERE id = ?"
    ).bind(orderId).first() as any;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const log: string[] = [];
    log.push(`Order found: ${orderId}, status=${order.status}, paymentStatus=${order.paymentStatus}`);

    // 1. Send customer notification
    try {
      const { createNotification } = await import("@/lib/notify-server");
      await createNotification(db, {
        userId: order.userId,
        userType: "customer",
        type: "order_update",
        title: "✅ ชำระเงินสำเร็จ",
        message: `งาน #${orderId.slice(-6)} ได้รับการยืนยันแล้ว กำลังจัดหาไรเดอร์...`,
        link: `/orders/${orderId}`
      });
      log.push(`✅ Customer in-app notification sent to ${order.userId}`);
    } catch (e: any) {
      log.push(`❌ Customer in-app notification failed: ${e.message}`);
    }

    // 2. Send customer LINE push
    let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!customerToken) {
      const setting = await db.prepare(
        "SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'"
      ).first() as any;
      if (setting?.value) customerToken = setting.value;
    }
    if (customerToken && order.userId) {
      try {
        const { sendLinePush, bookingConfirmationFlex } = await import("@/lib/line");
        const result = await sendLinePush(
          order.userId,
          [bookingConfirmationFlex(orderId, order.serviceId || "Laundry", order.totalPrice || 0)],
          customerToken
        );
        log.push(`✅ Customer LINE push sent. Result: ${JSON.stringify(result)}`);
      } catch (e: any) {
        log.push(`❌ Customer LINE push failed: ${e.message}`);
      }
    } else {
      log.push(`⚠️ Customer LINE push skipped. Token: ${customerToken ? "SET" : "MISSING"}, userId: ${order.userId || "MISSING"}`);
    }

    // 3. Broadcast to rubbers
    try {
      const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
      await broadcastToEligibleRubbers(
        db, env, orderId,
        order.address,
        order.deliveryFee || 0,
        "paid"
      );
      log.push(`✅ Rubber broadcast completed`);
    } catch (e: any) {
      log.push(`❌ Rubber broadcast failed: ${e.message}`);
    }

    // 4. Notify Admin
    try {
      const groupId = env.LINE_ADMIN_GROUP_ID;
      const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN_HELP || env.LINE_CHANNEL_ACCESS_TOKEN;
      if (groupId && accessToken) {
        const resp = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            to: groupId,
            messages: [{
              type: "text",
              text: `🔧 [DEBUG DISPATCH]\nรหัส: ${orderId}\nสถานะ: ${order.status} / ${order.paymentStatus}\n\nDispatch test triggered manually`
            }]
          })
        });
        log.push(`✅ Admin LINE notification sent (${resp.status})`);
      } else {
        log.push(`⚠️ Admin notification skipped. groupId: ${groupId ? "SET" : "MISSING"}, token: ${accessToken ? "SET" : "MISSING"}`);
      }
    } catch (e: any) {
      log.push(`❌ Admin notification failed: ${e.message}`);
    }

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
