import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { ensureSchema } from "@/lib/db-init";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await ensureSchema(db);

    const { results } = await db.prepare(`
      SELECT id, displayName, pictureUrl, phone, nickname, birthday, gender, role, assignedStoreId, points, createdAt
      FROM users
      WHERE role IS NULL OR role = 'user'
      ORDER BY createdAt DESC
    `).all();

    return NextResponse.json({ users: results });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json() as any;
    if (!id) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Soft delete / anonymize the user to preserve history (orders, chat, etc.)
    await db.prepare(`
      UPDATE users 
      SET displayName = 'Unknown User', 
          pictureUrl = NULL, 
          phone = NULL, 
          walletPin = NULL, 
          preferences = NULL,
          role = 'deleted'
      WHERE id = ?
    `).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
