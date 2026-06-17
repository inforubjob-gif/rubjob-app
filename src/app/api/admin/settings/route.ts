import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

// Keys that contain secrets — only visible to authenticated admins
const SENSITIVE_KEY_PREFIXES = ["beam_", "line_token_", "line_secret_"];

const DEFAULT_SETTINGS = [
  { key: "is_open", value: "true", type: "boolean", description: "Whether the platform is currently accepting new orders." },
  { key: "radius_km", value: "5", type: "number", description: "Default service radius for stores in kilometers." },
  { key: "gp_store_percent", value: "0", type: "number", description: "GP percentage taken from Store sales (Commission)." },
  { key: "gp_rubber_percent", value: "10", type: "number", description: "GP percentage taken from Rubber delivery fees." },
  { key: "platform_fee_per_delivery", value: "10", type: "number", description: "Fixed platform fee per delivery order (THB)." },
  { key: "min_order_amount", value: "0", type: "number", description: "Minimum order value required to place a booking." },
  { key: "delivery_fee_base", value: "50", type: "number", description: "Base delivery fee charged to customers." },
  { key: "line_token_regular", value: "", type: "string", description: "Channel Access Token for the Regular (Customer) LINE OA." },
  { key: "line_secret_regular", value: "", type: "string", description: "Channel Secret for the Regular (Customer) LINE OA." },
  { key: "line_token_rubber", value: "", type: "string", description: "Channel Access Token for the Rubber (Driver) LINE OA." },
  { key: "line_secret_rubber", value: "", type: "string", description: "Channel Secret for the Rubber (Driver) LINE OA." },
  { key: "line_token_help", value: "", type: "string", description: "Channel Access Token for the Help Support LINE OA." },
  { key: "line_secret_help", value: "", type: "string", description: "Channel Secret for the Help Support LINE OA." },
  { key: "beam_merchant_id", value: "", type: "string", description: "Beam Merchant ID (e.g. rubjob-yvqpfl)" },
  { key: "beam_api_key", value: "", type: "string", description: "Beam API Key (from Lighthouse dashboard)" },
  { key: "open_regions", value: JSON.stringify([{ province: "ขอนแก่น", areas: ["กังสดาล"] }]), type: "json", description: "Configurable regions open for service" },
];

/**
 * GET /api/admin/settings
 * Fetches all system settings, creating and seeding the table if necessary.
 * 🛡️ Non-admin callers receive filtered results (sensitive keys redacted).
 */
export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Check if caller is an admin (don't block — just determine access level)
    const adminSession = await getAdminSession();
    const isAdmin = !!adminSession;

    // Self-healing: system_settings table moved to db-init.ts

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

    // 🛡️ Filter sensitive keys for non-admin callers
    if (!isAdmin) {
      finalResults = (finalResults as any[]).filter((s: any) =>
        !SENSITIVE_KEY_PREFIXES.some(prefix => s.key?.startsWith(prefix))
      );
    }

    return NextResponse.json({ settings: finalResults });
  } catch (error: unknown) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/settings
 * Updates multiple settings at once.
 */
export async function PATCH(req: Request) {
  try {
    // 🛡️ Require admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { updates } = (await req.json() as any) as { updates: { key: string; value: string }[] };
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
  } catch (error: unknown) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
