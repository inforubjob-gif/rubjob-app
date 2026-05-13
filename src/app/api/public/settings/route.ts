import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results } = await db.prepare(`SELECT key, value FROM system_settings WHERE key IN ('is_open', 'open_regions')`).all();
    
    const settings: Record<string, any> = {};
    for (const r of (results as any[])) {
       if (r.key === 'open_regions') {
          settings[r.key] = JSON.parse(r.value || "[]");
       } else {
          settings[r.key] = r.value;
       }
    }

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
