import { safeError } from "@/lib/api-utils";
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
  } catch (error: unknown) {
    console.error("Fetch addresses error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * POST /api/user/addresses
 * Adds a new address
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json() as any) as any;
    const { userId, label, note, lat, lng, isDefault } = body;
    // details is optional — fallback to label if not provided
    const details = body.details || label;
    
    if (!userId || !label) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const id = `ADDR-${Date.now()}`;
    
    // Self-healing: addresses table moved to db-init.ts


    // Self-healing columns moved to db-init.ts

    // 3. If isDefault is true, unset other defaults first
    if (isDefault) {
      await db.prepare(`UPDATE addresses SET isDefault = 0 WHERE userId = ?`).bind(userId).run();
    }

    await db.prepare(`
      INSERT INTO addresses (id, userId, label, details, note, lat, lng, isDefault)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, label, details, note, lat, lng, isDefault ? 1 : 0).run();

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error("Create address error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * PUT /api/user/addresses
 * Updates an existing address
 */
export async function PUT(req: Request) {
  try {
    const body = (await req.json() as any) as any;
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
  } catch (error: unknown) {
    console.error("Update address error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * PATCH /api/user/addresses
 * Sets an address as default
 */
export async function PATCH(req: Request) {
  try {
    const body = (await req.json() as any) as any;
    const { id, userId, isDefault } = body;
    
    if (!id || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    if (isDefault) {
      // Unset other defaults for this user
      await db.prepare(`UPDATE addresses SET isDefault = 0 WHERE userId = ?`).bind(userId).run();
      // Set this one as default
      await db.prepare(`UPDATE addresses SET isDefault = 1 WHERE id = ?`).bind(id).run();
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Patch address error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
