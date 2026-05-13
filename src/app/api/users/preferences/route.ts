import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/users/preferences?userId=XYZ
 * Fetch user preferences.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 500 });
    }

    // Determine table based on ID prefix
    const tableName = userId.startsWith("RDR-") ? "rubber_users" : "users";
    
    // Self-healing columns moved to db-init.ts

    const user = await db.prepare(`SELECT preferences FROM ${tableName} WHERE id = ?`).bind(userId).first() as any;
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let preferences = {};
    if (user.preferences) {
      try {
        preferences = JSON.parse(user.preferences);
      } catch (e) {
        console.error("Failed to parse preferences JSON", e);
      }
    }

    return NextResponse.json({ preferences });
  } catch (error: unknown) {
    console.error("GET preferences error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * POST /api/users/preferences
 * Update specific fields in user preferences
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as any;
    const { userId, ...updates } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 500 });
    }

    const tableName = userId.startsWith("RDR-") ? "rubber_users" : "users";

    // Step 1: Read existing preferences
    const user = await db.prepare(`SELECT preferences FROM ${tableName} WHERE id = ?`).bind(userId).first() as any;
    let currentPrefs = {};
    
    if (user && user.preferences) {
      try {
        currentPrefs = JSON.parse(user.preferences as string);
      } catch (e) {
        console.error("Failed to parse", e);
      }
    }

    // Step 2: Merge preferences
    const newPrefs = { ...currentPrefs, ...updates };

    // Step 3: Write back
    try {
      await db.prepare(`UPDATE ${tableName} SET preferences = ? WHERE id = ?`)
        .bind(JSON.stringify(newPrefs), userId)
        .run();
    } catch (err: unknown) {
      // Column should exist via db-init.ts; re-throw if it's a different error
      throw err;
    }

    return NextResponse.json({ success: true, preferences: newPrefs });
  } catch (error: unknown) {
    console.error("POST preferences error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
