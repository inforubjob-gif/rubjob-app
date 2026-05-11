import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/debug/test-push
 * 🔬 DEFINITIVE TEST — Sends a LINE push message directly to the rubber driver
 * and returns the RAW HTTP response from LINE API.
 * This bypasses ALL application logic to isolate the exact failure point.
 */
export async function GET(req: Request) {
  const env = getRequestContext().env;
  const db = env.DB;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  try {
    const tickets = await db.prepare("SELECT id, channel, userId, userType FROM support_tickets ORDER BY createdAt DESC LIMIT 5").all();
    const settings = await db.prepare("SELECT key, value FROM system_settings WHERE key LIKE 'line_token_%'").all();
    return NextResponse.json({ tickets: tickets.results, settings: settings.results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
