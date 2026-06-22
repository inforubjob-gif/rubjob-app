import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * GET /api/admin/dispatch-debug
 * Diagnostic endpoint to check why LINE push to rubbers might not be working.
 * Admin-only.
 */
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getRequestContext().env.DB;
    const env = getRequestContext().env as any;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    // 1. Check LINE token for rubber
    let rubberTokenSource = "none";
    let rubberTokenSet = false;
    try {
      const setting = await db.prepare(
        "SELECT value FROM system_settings WHERE key = 'line_token_rubber'"
      ).first() as any;
      if (setting?.value) {
        rubberTokenSet = true;
        rubberTokenSource = "db (system_settings)";
      }
    } catch (e) {
      rubberTokenSource = `db_error: ${e}`;
    }

    if (!rubberTokenSet && env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER) {
      rubberTokenSet = true;
      rubberTokenSource = "env (LINE_CHANNEL_ACCESS_TOKEN_RUBBER)";
    }

    // 2. Check eligible rubbers
    const { results: activeRubbers } = await db.prepare(
      "SELECT id, name, lineUserId, preferences, status FROM rubber_users WHERE status = 'active'"
    ).all() as any;

    const rubberBreakdown = (activeRubbers || []).map((r: any) => {
      let prefs: any = {};
      try { prefs = JSON.parse(r.preferences || "{}"); } catch {}
      return {
        id: r.id,
        name: r.name,
        lineUserId: r.lineUserId ? `${r.lineUserId.slice(0, 8)}...` : null,
        hasLineUserId: !!r.lineUserId,
        workStatus: prefs.workStatus,
        hasServiceAreaCoords: !!prefs.serviceAreaCoords,
      };
    });

    const online = rubberBreakdown.filter((r: any) => r.workStatus === true);
    const withLine = online.filter((r: any) => r.hasLineUserId);

    // 3. Recent dispatch logs
    let recentLogs: any[] = [];
    try {
      const { results } = await db.prepare(
        "SELECT id, channel, substr(payload,1,100) as payload, error FROM webhook_logs WHERE channel LIKE 'dispatch%' OR channel LIKE 'filter%' OR channel LIKE 'earn%' ORDER BY rowid DESC LIMIT 20"
      ).all();
      recentLogs = results || [];
    } catch (e) {
      recentLogs = [{ error: `query_failed: ${e}` }];
    }

    // 4. Recent orders that should have triggered dispatch
    let recentOrders: any[] = [];
    try {
      const { results } = await db.prepare(
        "SELECT id, status, paymentStatus, pickupDriverId, deliveryDriverId, updatedAt FROM orders WHERE paymentStatus = 'paid' ORDER BY updatedAt DESC LIMIT 5"
      ).all();
      recentOrders = results || [];
    } catch (e) {
      recentOrders = [{ error: `query_failed: ${e}` }];
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      lineToken: {
        rubberTokenSet,
        rubberTokenSource,
      },
      rubbers: {
        totalActive: activeRubbers?.length || 0,
        online: online.length,
        onlineWithLine: withLine.length,
        breakdown: rubberBreakdown,
      },
      recentDispatchLogs: recentLogs,
      recentPaidOrders: recentOrders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/dispatch-debug
 * Send a test LINE push to a SINGLE rubber only.
 * Body: { rubberId: "RDR-XXX" }
 */
export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rubberId } = await req.json() as { rubberId?: string };
    if (!rubberId) return NextResponse.json({ error: "rubberId required" }, { status: 400 });

    const db = getRequestContext().env.DB;
    const env = getRequestContext().env as any;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    const steps: { step: string; status: string; detail?: any }[] = [];

    // Step 1: Check rubber exists
    const rubber = await db.prepare(
      "SELECT id, name, lineUserId, preferences, status FROM rubber_users WHERE id = ?"
    ).bind(rubberId).first() as any;

    if (!rubber) {
      steps.push({ step: "find_rubber", status: "FAIL", detail: "Rubber not found" });
      return NextResponse.json({ success: false, steps });
    }
    steps.push({ step: "find_rubber", status: "OK", detail: { id: rubber.id, name: rubber.name, dbStatus: rubber.status } });

    // Step 2: Check lineUserId
    if (!rubber.lineUserId) {
      steps.push({ step: "check_line_linked", status: "FAIL", detail: "Rubber ไม่ได้เชื่อมต่อ LINE (lineUserId = null)" });
      return NextResponse.json({ success: false, steps });
    }
    steps.push({ step: "check_line_linked", status: "OK", detail: { lineUserId: rubber.lineUserId } });

    // Step 3: Check workStatus
    let prefs: any = {};
    try { prefs = JSON.parse(rubber.preferences || "{}"); } catch {}
    steps.push({ step: "check_workStatus", status: prefs.workStatus === true ? "OK" : "WARN", detail: { workStatus: prefs.workStatus, note: prefs.workStatus !== true ? "workStatus ไม่ได้เปิด — dispatch ปกติจะ skip คนนี้" : "เปิดรับงานอยู่" } });

    // Step 4: Get LINE token
    let rubberToken: string | null = null;
    let tokenSource = "none";

    try {
      const setting = await db.prepare(
        "SELECT value FROM system_settings WHERE key = 'line_token_rubber'"
      ).first() as any;
      if (setting?.value) {
        rubberToken = setting.value;
        tokenSource = "db:line_token_rubber";
      }
    } catch (e: any) {
      steps.push({ step: "get_token_db", status: "ERROR", detail: e.message });
    }

    if (!rubberToken && env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER) {
      rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
      tokenSource = "env:LINE_CHANNEL_ACCESS_TOKEN_RUBBER";
    }

    if (!rubberToken) {
      steps.push({ step: "get_token", status: "FAIL", detail: "❌ ไม่มี Rubber LINE Token ทั้งใน DB และ env — นี่คือสาเหตุที่ LINE push ไม่ทำงาน!" });
      return NextResponse.json({ success: false, steps });
    }
    steps.push({ step: "get_token", status: "OK", detail: { source: tokenSource, tokenPreview: `${rubberToken.slice(0, 10)}...${rubberToken.slice(-6)}` } });

    // Step 5: Send test LINE push
    try {
      const { sendLinePush, rubberNewJobFlex } = await import("@/lib/line");
      const testFlex = rubberNewJobFlex("TEST-ORDER", "paid", 99);
      const result = await sendLinePush(rubber.lineUserId, [testFlex], rubberToken);
      steps.push({ step: "send_line_push", status: "OK", detail: { result, note: "✅ ส่ง LINE push สำเร็จ!" } });
    } catch (err: any) {
      steps.push({ step: "send_line_push", status: "FAIL", detail: { error: err.message, note: "❌ LINE push ล้มเหลว — ตรวจสอบ token หรือ lineUserId" } });
      return NextResponse.json({ success: false, steps });
    }

    return NextResponse.json({ success: true, steps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
