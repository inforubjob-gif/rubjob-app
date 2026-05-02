import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/coupons
 * List visible, active coupons
 * Optional: ?role=rider|store|customer to filter by eligible role
 */
export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing
    try { await db.prepare("ALTER TABLE coupons ADD COLUMN eligibleRoles TEXT DEFAULT 'all'").run(); } catch (e) {}

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // rider | store | customer

    const { results } = await db.prepare(`
      SELECT * FROM coupons 
      WHERE isActive = 1 AND isVisible = 1
      ORDER BY createdAt DESC
    `).all();

    // Filter by role if specified
    let filtered = results;
    if (role) {
      filtered = results.filter((c: any) => {
        const eligible = c.eligibleRoles || 'all';
        if (eligible === 'all') return true;
        return eligible.split(',').map((r: string) => r.trim()).includes(role);
      });
    }

    return NextResponse.json({ coupons: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
