import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * GET /api/admin/password-resets
 * 
 * Returns count of pending password reset tokens
 * (for Rubbers who don't have LINE linked — need manual attention)
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Count pending tokens where the rubber doesn't have LINE linked
    const result = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM password_reset_tokens prt
      JOIN rubber_users r ON prt.rubberId = r.id
      WHERE prt.status = 'pending' 
        AND prt.expiresAt > datetime('now')
        AND (r.lineUserId IS NULL OR r.lineUserId = '')
    `).first() as any;

    return NextResponse.json({ pendingCount: result?.count || 0 });
  } catch {
    return NextResponse.json({ pendingCount: 0 });
  }
}
