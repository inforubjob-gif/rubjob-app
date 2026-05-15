import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results } = await db.prepare(`
      SELECT id, displayName, pictureUrl, role, assignedStoreId, points, createdAt
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

    // Forcefully delete all related records to prevent foreign key constraint errors
    await db.batch([
      db.prepare(`DELETE FROM support_messages WHERE ticketId IN (SELECT id FROM support_tickets WHERE userId = ?)`).bind(id),
      db.prepare(`DELETE FROM support_tickets WHERE userId = ?`).bind(id),
      db.prepare(`DELETE FROM notifications WHERE userId = ?`).bind(id),
      db.prepare(`DELETE FROM addresses WHERE userId = ?`).bind(id),
      db.prepare(`DELETE FROM store_services WHERE storeId IN (SELECT id FROM stores WHERE ownerId = ?)`).bind(id),
      db.prepare(`DELETE FROM store_documents WHERE storeId IN (SELECT id FROM stores WHERE ownerId = ?)`).bind(id),
      db.prepare(`DELETE FROM stores WHERE ownerId = ?`).bind(id),
      db.prepare(`DELETE FROM orders WHERE userId = ?`).bind(id),
      db.prepare(`DELETE FROM specialist_profiles WHERE id = ?`).bind(id),
      db.prepare(`DELETE FROM users WHERE id = ?`).bind(id)
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
