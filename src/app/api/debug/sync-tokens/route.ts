import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/debug/sync-tokens
 * Syncs the ENV LINE tokens into the DB system_settings table
 * so there's no mismatch between ENV and DB fallback tokens.
 */
export async function GET() {
  const env = getRequestContext().env;
  const db = env.DB;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  const results: any[] = [];

  // Sync Rubber token
  const rubberToken = (env as any).LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
  if (rubberToken) {
    await db.prepare(
      "UPDATE system_settings SET value = ? WHERE key = 'line_token_rubber'"
    ).bind(rubberToken).run();
    results.push({ key: "line_token_rubber", action: "SYNCED from ENV", prefix: rubberToken.substring(0, 10) });
  }

  // Sync Customer token
  const customerToken = (env as any).LINE_CHANNEL_ACCESS_TOKEN;
  if (customerToken) {
    await db.prepare(
      "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('line_token_regular', ?)"
    ).bind(customerToken).run();
    results.push({ key: "line_token_regular", action: "SYNCED from ENV", prefix: customerToken.substring(0, 10) });
  }

  return NextResponse.json({ success: true, synced: results });
}
