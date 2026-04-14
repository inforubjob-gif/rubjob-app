import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

const DEFAULT_SETTINGS = [
  { key: "is_open", value: "true", type: "boolean", description: "Whether the platform is currently accepting new orders." },
  { key: "radius_km", value: "5", type: "number", description: "Default service radius for stores in kilometers." },
  { key: "gp_store_percent", value: "20", type: "number", description: "GP percentage taken from Store sales (Commission)." },
  { key: "gp_rider_percent", value: "10", type: "number", description: "GP percentage taken from Rider delivery fees." },
  { key: "rider_base_payout", value: "25", type: "number", description: "Flat base amount paid to riders per delivery before distance bonus." },
  { key: "min_order_amount", value: "0", type: "number", description: "Minimum order value required to place a booking." },
  { key: "delivery_fee_base", value: "39", type: "number", description: "Base delivery fee charged to customers." },
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
    const { results: existing } = await db.prepare(`SELECT * FROM system_settings`).all();
    const existingKeys = new Set((existing as any[]).map(r => r.key));

    // 3. Ensure all DEFAULT_SETTINGS exist (Auto-migration)
    let needsRefresh = false;
    for (const item of DEFAULT_SETTINGS) {
      if (!existingKeys.has(item.key)) {
        await db.prepare(`
          INSERT INTO system_settings (key, value, type, description)
          VALUES (?, ?, ?, ?)
        `).bind(item.key, item.value, item.type, item.description).run();
        needsRefresh = true;
      }
    }

    let finalResults = existing;
    if (needsRefresh) {
      const { results } = await db.prepare(`SELECT * FROM system_settings`).all();
      finalResults = results;
    }

    return NextResponse.json({ settings: finalResults });
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
