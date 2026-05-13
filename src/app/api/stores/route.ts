import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/stores
 * Fetches all active stores from Cloudflare D1
 */
export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT * FROM stores 
      WHERE isActive = 1
    `).all();

    return NextResponse.json(
      { stores: results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Fetch stores error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
