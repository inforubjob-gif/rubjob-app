import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * POST /api/admin/fix-deleted-users
 * One-time fix: Reset users with role='deleted' back to 'user'
 * so they reappear in the admin panel.
 */
export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Find all soft-deleted users
    const { results: deletedUsers } = await db.prepare(
      `SELECT id, displayName, role FROM users WHERE role = 'deleted'`
    ).all();

    // Reset them back to 'user'
    let fixed = 0;
    for (const u of deletedUsers) {
      await db.prepare(
        `UPDATE users SET role = 'user' WHERE id = ?`
      ).bind(u.id).run();
      fixed++;
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} deleted user(s)`,
      fixedUsers: deletedUsers,
    });
  } catch (error) {
    console.error("Fix deleted users error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * GET /api/admin/fix-deleted-users
 * Debug: Show all users and their roles
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results: allUsers } = await db.prepare(
      `SELECT id, displayName, role, createdAt FROM users ORDER BY createdAt DESC`
    ).all();

    return NextResponse.json({ totalUsers: allUsers.length, users: allUsers });
  } catch (error) {
    console.error("Debug users error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
