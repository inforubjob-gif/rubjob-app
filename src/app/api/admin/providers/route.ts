import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/admin/providers
 * Fetch list of all freelance providers
 * 
 * PUT /api/admin/providers
 * Update provider status (active, pending, suspended)
 */

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results: providers } = await db.prepare(`
      SELECT id, email, name, status, pictureUrl, bio, createdAt,
             (SELECT COUNT(*) FROM provider_services WHERE providerId = provider_users.id) as gigCount
      FROM provider_users
      ORDER BY createdAt DESC
    `).all();

    return NextResponse.json({ providers });
  } catch (err: any) {
    console.error("Admin providers GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    await db.prepare(`
        UPDATE provider_users 
        SET status = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).bind(status, id).run();

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("Admin providers PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
