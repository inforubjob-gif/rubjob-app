import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/payment/config
 * Returns the Stripe Publishable Key from settings
 */
export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    // Try to get from Env first (for speed/security)
    let publishableKey = getRequestContext().env.STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      // Fallback to database settings
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'stripe_publishable_key'").first() as { value: string };
      publishableKey = setting?.value;
    }

    return NextResponse.json({ publishableKey });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
