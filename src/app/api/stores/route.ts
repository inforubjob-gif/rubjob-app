import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/stores
 * Fetches all active stores from Cloudflare D1
 */
export async function GET(req: Request) {
  try {
    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT * FROM stores 
      WHERE isActive = 1
    `).all();

    return NextResponse.json({ stores: results });
  } catch (error: any) {
    console.error("Fetch stores error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
