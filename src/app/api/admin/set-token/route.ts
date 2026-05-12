import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * POST /api/admin/set-token
 * Temporary endpoint to set LINE tokens in system_settings.
 * Body: { key: string, value: string }
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { key, value } = (await req.json()) as { key: string; value: string };
    
    if (!key || !value) {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }

    // Only allow setting LINE-related keys
    if (!key.startsWith("line_")) {
      return NextResponse.json({ error: "Only line_ keys are allowed" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    // Ensure table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        type TEXT,
        description TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Upsert the value
    await db.prepare(`
      INSERT INTO system_settings (key, value, type, description, updatedAt)
      VALUES (?, ?, 'string', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = CURRENT_TIMESTAMP
    `).bind(key, value, `Set via API on ${new Date().toISOString()}`, value).run();

    // Verify
    const check = await db.prepare(
      "SELECT key, LENGTH(value) as len FROM system_settings WHERE key = ?"
    ).bind(key).first() as any;

    return NextResponse.json({ 
      success: true, 
      message: `Token '${key}' saved successfully`,
      verification: check 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
