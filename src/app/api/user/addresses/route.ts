import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/user/addresses
 * Fetches saved addresses for a user
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT * FROM addresses 
      WHERE userId = ? 
      ORDER BY isDefault DESC, id DESC
    `).bind(userId).all();

    return NextResponse.json({ addresses: results });
  } catch (error: any) {
    console.error("Fetch addresses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/user/addresses
 * Adds a new address
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { userId, label, details, note, lat, lng, isDefault } = body;
    
    if (!userId || !label || !details) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const id = `ADDR-${Date.now()}`;
    
    // 1. Ensure table exists (Self-healing)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        label TEXT NOT NULL,
        details TEXT,
        note TEXT,
        lat REAL,
        lng REAL,
        isDefault INTEGER DEFAULT 0
      )
    `).run();

    // 2. Migration Guard: Add missing columns if they don't exist (Self-healing for existing tables)
    try {
      await db.prepare(`ALTER TABLE addresses ADD COLUMN note TEXT`).run();
    } catch (e) { /* Column might already exist */ }
    
    try {
      await db.prepare(`ALTER TABLE addresses ADD COLUMN lat REAL`).run();
    } catch (e) { /* Column might already exist */ }
    
    try {
      await db.prepare(`ALTER TABLE addresses ADD COLUMN lng REAL`).run();
    } catch (e) { /* Column might already exist */ }

    // 3. If isDefault is true, unset other defaults first
    if (isDefault) {
      await db.prepare(`UPDATE addresses SET isDefault = 0 WHERE userId = ?`).bind(userId).run();
    }

    await db.prepare(`
      INSERT INTO addresses (id, userId, label, details, note, lat, lng, isDefault)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, label, details, note, lat, lng, isDefault ? 1 : 0).run();

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Create address error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/user/addresses
 * Updates an existing address
 */
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as any;
    const { id, label, details, note, lat, lng } = body;
    
    if (!id || !label || !details) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    await db.prepare(`
      UPDATE addresses 
      SET label = ?, details = ?, note = ?, lat = ?, lng = ?
      WHERE id = ?
    `).bind(label, details, note, lat, lng, id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update address error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
