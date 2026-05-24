import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/user/accept-terms
 * Records that a user has accepted the Terms of Service.
 * Body: { userId: string }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await req.json() as any;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    await db.prepare(`
      UPDATE users SET termsAcceptedAt = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(userId).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Accept terms error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
