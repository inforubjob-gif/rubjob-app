import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { hashPassword } from "@/lib/password";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing columns moved to db-init.ts

    const { results } = await db.prepare(`
      SELECT id, email, name, role, permissions, avatarUrl, createdAt
      FROM admin_users
      ORDER BY createdAt DESC
    `).all();

    return NextResponse.json({ admins: results });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { email, password, name, role, permissions, avatarUrl } = await req.json() as any;
    if (!email || !password) return NextResponse.json({ error: "Missing email or password" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const id = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    await db.prepare(`
      INSERT INTO admin_users (id, email, password, name, role, permissions, avatarUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, email, hashedPassword, name || email.split('@')[0], role || 'admin', 
      permissions ? JSON.stringify(permissions) : null,
      avatarUrl || null
    ).run();

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    if (((error instanceof Error) ? safeError(error) : "").includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, email, password, name, role, permissions, avatarUrl } = await req.json() as any;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const hashedPw = password ? await hashPassword(password) : null;

    await db.prepare(`
      UPDATE admin_users 
      SET email = COALESCE(?, email),
          password = COALESCE(?, password),
          name = COALESCE(?, name),
          role = COALESCE(?, role),
          permissions = COALESCE(?, permissions),
          avatarUrl = COALESCE(?, avatarUrl)
      WHERE id = ?
    `).bind(
      email || null, hashedPw, name || null, role || null, 
      permissions ? JSON.stringify(permissions) : null,
      avatarUrl || null, id
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
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Prevent deleting the initial system admin if needed, but for now allow it if requested
    await db.prepare(`DELETE FROM admin_users WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
