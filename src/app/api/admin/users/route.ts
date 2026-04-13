import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = (req as any).context?.env?.DB;
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
    const { id, role, assignedStoreId } = await req.json() as any;
    if (!id || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`
      UPDATE users SET role = ?, assignedStoreId = ? WHERE id = ?
    `).bind(role, assignedStoreId || null, id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
