import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * POST /api/admin/logout
 * Clears admin session cookie
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const hostname = req.headers.get("host") || "";
    const rootDomain = ["rubjob-all.com", "rubjob.com", "rubjob-app.pages.dev", "lvh.me"].find(d => hostname.endsWith(d));

    cookieStore.set("admin_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: rootDomain ? `.${rootDomain}` : undefined,
      maxAge: 0, // Expire immediately
    });

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Admin logout error:", err);
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
  }
}
