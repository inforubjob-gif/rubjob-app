import { safeError } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getAdminSession } from "@/lib/auth-server";
import { nanoid } from "nanoid";

export const runtime = "edge";

/**
 * POST /api/admin/audit
 * Record an audit log entry for admin actions
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, targetType, targetId, details } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(
      `INSERT INTO audit_logs (id, adminId, adminName, action, targetType, targetId, details) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      `AUD-${nanoid(8)}`,
      (session as any).id || "unknown",
      (session as any).name || "Admin",
      action,
      targetType || null,
      targetId || null,
      details || null
    ).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Audit log error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
