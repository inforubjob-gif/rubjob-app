import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

/**
 * GET /api/services
 * Fetches all available services from Cloudflare D1
 */
export async function GET(req: Request) {
  try {
    // Access D1 from Cloudflare context via getRequestContext
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT * FROM services 
      WHERE isActive = 1
      ORDER BY category ASC, name ASC
    `).all();

    return NextResponse.json(
      { services: results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
