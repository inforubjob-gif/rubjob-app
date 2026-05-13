import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("admin_token")?.value;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing columns moved to db-init.ts

    const admin = await db.prepare(`
      SELECT id, email, name, role, permissions, avatarUrl FROM admin_users WHERE email = ?
    `).bind(email).first() as any;

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({
      admin: {
        ...admin,
        permissions: admin.permissions ? JSON.parse(admin.permissions) : null
      }
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
