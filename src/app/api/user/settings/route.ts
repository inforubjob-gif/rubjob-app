import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/user/settings?userId=...
 * Fetches user preferences
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const user = await db.prepare("SELECT preferences FROM users WHERE id = ?").bind(userId).first();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const settings = JSON.parse(user.preferences || "{}");
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/user/settings
 * Updates user preferences
 */
export async function POST(req: Request) {
  try {
    const { userId, settings } = await req.json() as any;

    if (!userId || !settings) {
      return NextResponse.json({ error: "User ID and settings required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    // Merge or overwrite preferences? For simplicity, we'll overwrite the keys provided
    // First, get existing
    const existing = await db.prepare("SELECT preferences FROM users WHERE id = ?").bind(userId).first();
    const currentPrefs = JSON.parse(existing?.preferences || "{}");
    
    const newPrefs = {
      ...currentPrefs,
      ...settings
    };

    await db.prepare("UPDATE users SET preferences = ? WHERE id = ?")
      .bind(JSON.stringify(newPrefs), userId)
      .run();

    return NextResponse.json({ success: true, settings: newPrefs });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
