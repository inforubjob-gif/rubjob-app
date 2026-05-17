import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * POST /api/admin/reset
 * Reset (clear) test data from the database.
 * Only super_admin can execute this.
 * Body: { target: "orders" | "payouts" | "all" }
 */
export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Super admin only" }, { status: 403 });
    }

    const { target } = await req.json();
    const { env } = getRequestContext();
    const db = env.DB;

    const results: string[] = [];

    if (target === "orders" || target === "all") {
      // Count before delete
      const countRes = await db.prepare("SELECT COUNT(*) as c FROM orders").first() as any;
      const count = countRes?.c || 0;

      await db.prepare("DELETE FROM orders").run();
      results.push(`ลบออเดอร์ ${count} รายการ`);
    }

    if (target === "payouts" || target === "all") {
      const countRes = await db.prepare("SELECT COUNT(*) as c FROM payout_requests").first() as any;
      const count = countRes?.c || 0;

      await db.prepare("DELETE FROM payout_requests").run();
      results.push(`ลบคำขอถอนเงิน ${count} รายการ`);
    }

    if (target === "all") {
      // Also clean up webhook logs if table exists
      try {
        const countRes = await db.prepare("SELECT COUNT(*) as c FROM webhook_logs").first() as any;
        const count = countRes?.c || 0;
        await db.prepare("DELETE FROM webhook_logs").run();
        results.push(`ลบ webhook logs ${count} รายการ`);
      } catch {
        // Table may not exist
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: results.join(", ") || "ไม่มีข้อมูลให้ลบ"
    });
  } catch (err: unknown) {
    console.error("Reset error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
