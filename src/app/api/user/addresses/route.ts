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

    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const { results } = await db.prepare(`
      SELECT * FROM addresses 
      WHERE userId = ? 
      ORDER BY isDefault DESC, createdAt DESC
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
    const { userId, label, details, lat, lng, isDefault } = body;
    
    if (!userId || !label || !details) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = (req as any).context?.env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const id = `ADDR-${Date.now()}`;
    
    // If isDefault is true, unset other defaults first
    if (isDefault) {
      await db.prepare(`UPDATE addresses SET isDefault = 0 WHERE userId = ?`).bind(userId).run();
    }

    await db.prepare(`
      INSERT INTO addresses (id, userId, label, details, lat, lng, isDefault)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, label, details, lat, lng, isDefault ? 1 : 0).run();

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Create address error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
