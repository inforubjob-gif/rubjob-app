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
