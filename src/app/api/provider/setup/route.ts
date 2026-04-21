import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/provider/setup
 * Register a new provider with skills and pricing
 */
export async function POST(req: Request) {
  try {
    const { userId, name, phone, email, skills, pricing, pricingUnit, bio } = await req.json() as any;

    if (!userId || !name) {
      return NextResponse.json({ error: "userId and name are required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: ensure table exists
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS provider_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          phone TEXT DEFAULT '',
          pictureUrl TEXT DEFAULT '',
          lineUserId TEXT,
          skills TEXT DEFAULT '[]',
          pricing TEXT DEFAULT '{}',
          pricingUnit TEXT DEFAULT '{}',
          bio TEXT DEFAULT '',
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (e) {}

    await db.prepare(`
      INSERT INTO provider_users (id, email, password, name, phone, skills, pricing, pricingUnit, bio, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        skills = excluded.skills,
        pricing = excluded.pricing,
        pricingUnit = excluded.pricingUnit,
        bio = excluded.bio
    `).bind(
      userId,
      email || `${userId}@rubjob.com`,
      "password_placeholder",
      name,
      phone || "",
      JSON.stringify(skills || []),
      JSON.stringify(pricing || {}),
      JSON.stringify(pricingUnit || {}),
      bio || ""
    ).run();

    // Update parent User role
    try {
      await db.prepare(`UPDATE users SET role = 'specialist' WHERE id = ?`).bind(userId).run();
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Provider setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
