import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results } = await db.prepare(`
      SELECT id, displayName, pictureUrl, role, assignedStoreId, points, createdAt
      FROM users
      ORDER BY createdAt DESC
    `).all();

    return NextResponse.json({ users: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id, role, assignedStoreId, displayName, points } = await req.json() as any;
    if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`
      UPDATE users 
      SET role = COALESCE(?, role), 
          assignedStoreId = COALESCE(?, assignedStoreId),
          displayName = COALESCE(?, displayName),
          points = COALESCE(?, points)
      WHERE id = ?
    `).bind(
      role || null, 
      assignedStoreId || null, 
      displayName || null, 
      points !== undefined ? points : null,
      id
    ).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json() as any;
    if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
