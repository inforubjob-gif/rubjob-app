import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

const DEFAULT_SETTINGS = [
  { key: "is_open", value: "true", type: "boolean", description: "Whether the platform is currently accepting new orders." },
  { key: "radius_km", value: "5", type: "number", description: "Default service radius for stores in kilometers." },
  { key: "commission_rate", value: "15", type: "number", description: "Platform commission percentage taken from orders." },
  { key: "min_order_amount", value: "0", type: "number", description: "Minimum order value required to place a booking." },
  { key: "delivery_fee_base", value: "0", type: "number", description: "Default base delivery fee for laundry services." },
  { key: "line_token_regular", value: "", type: "string", description: "Channel Access Token for the Regular LINE OA." },
  { key: "line_secret_regular", value: "", type: "string", description: "Channel Secret for the Regular LINE OA." },
  { key: "line_token_help", value: "", type: "string", description: "Channel Access Token for the Help Support LINE OA." },
  { key: "line_secret_help", value: "", type: "string", description: "Channel Secret for the Help Support LINE OA." },
];

/**
 * GET /api/admin/settings
 * Fetches all system settings, creating and seeding the table if necessary.
 */
export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Ensure table exists (Self-healing)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        type TEXT,
        description TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 2. Fetch existing
    let { results } = await db.prepare(`SELECT * FROM system_settings`).all();

    // 3. Seed if empty
    if (results.length === 0) {
      for (const item of DEFAULT_SETTINGS) {
        await db.prepare(`
          INSERT INTO system_settings (key, value, type, description)
          VALUES (?, ?, ?, ?)
        `).bind(item.key, item.value, item.type, item.description).run();
      }
      const seeded = await db.prepare(`SELECT * FROM system_settings`).all();
      results = seeded.results;
    }

    return NextResponse.json({ settings: results });
  } catch (error: any) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/settings
 * Updates multiple settings at once.
 */
export async function PATCH(req: Request) {
  try {
    const { updates } = (await req.json()) as { updates: { key: string; value: string }[] };
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Update each provided key
    for (const item of updates) {
      await db.prepare(`
        UPDATE system_settings 
        SET value = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE key = ?
      `).bind(String(item.value), item.key).run();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
