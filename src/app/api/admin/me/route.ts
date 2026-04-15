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

    // Self-healing: Ensure columns exist
    try {
      await db.prepare("ALTER TABLE admin_users ADD COLUMN permissions TEXT").run();
    } catch (e) {}
    try {
      await db.prepare("ALTER TABLE admin_users ADD COLUMN avatarUrl TEXT").run();
    } catch (e) {}

    const admin = await db.prepare(`
      SELECT id, email, name, role, permissions, avatarUrl FROM admin_users WHERE email = ?
    `).bind(email).first() as any;

    if (!admin) {
      // Fallback for Master Admin if not in DB
      const masterEmail = process.env.ADMIN_EMAIL || "admin@rubjob.com";
      if (email === masterEmail) {
        return NextResponse.json({
          admin: {
            name: "Master Admin",
            email: masterEmail,
            role: "super_admin",
            permissions: null,
            avatarUrl: null
          }
        });
      }
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({
      admin: {
        ...admin,
        permissions: admin.permissions ? JSON.parse(admin.permissions) : null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
