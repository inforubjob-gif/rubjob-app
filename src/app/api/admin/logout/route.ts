import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * POST /api/admin/logout
 * Clears admin session cookie — tries multiple domain variants to ensure deletion
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const hostname = req.headers.get("host") || "";
    const rootDomain = ["rubjob-all.com", "rubjob-app.pages.dev", "lvh.me"].find(d => hostname.endsWith(d));

    // Clear without domain (matches cookies set without explicit domain)
    cookieStore.set("admin_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // Also clear with domain prefix (matches cookies set with .domain)
    if (rootDomain) {
      cookieStore.set("admin_token", "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        domain: `.${rootDomain}`,
        maxAge: 0,
      });
    }

    // Build response that also sets Set-Cookie headers directly as fallback
    const res = NextResponse.json({ success: true, message: "Logged out successfully" });
    res.headers.append("Set-Cookie", `admin_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    if (rootDomain) {
      res.headers.append("Set-Cookie", `admin_token=; Path=/; Domain=.${rootDomain}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    }

    return res;
  } catch (err) {
    console.error("Admin logout error:", err);
    // Even on error, try to clear via response header
    const res = NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
    res.headers.append("Set-Cookie", `admin_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return res;
  }
}
