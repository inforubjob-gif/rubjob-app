import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/services
 * Fetches all available services from Cloudflare D1
 */
export async function GET(req: Request) {
  try {
    // Access D1 from Cloudflare context
    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT * FROM services 
      WHERE isActive = 1
      ORDER BY category ASC, name ASC
    `).all();

    return NextResponse.json({ services: results });
  } catch (error: any) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
