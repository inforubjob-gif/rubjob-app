import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as any as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Please provide email and password" }, { status: 400 });
    }

    let adminData: any = null;

    // 1. Try D1 Database (Safe check for local dev)
    try {
      const context = getRequestContext();
      const db = context?.env?.DB;
      
      if (db) {
        // Self-healing: Ensure columns exist
        try {
          await db.prepare("ALTER TABLE admin_users ADD COLUMN permissions TEXT").run();
        } catch (e) {}
        try {
          await db.prepare("ALTER TABLE admin_users ADD COLUMN avatarUrl TEXT").run();
        } catch (e) {}

        const admin = await db.prepare(`
          SELECT * FROM admin_users WHERE email = ? AND password = ?
        `).bind(email, password).first();

        if (admin) {
          adminData = admin;
        }
      }
    } catch (dbErr) {
      console.warn("D1 access failed or context missing, using fallback:", dbErr);
    }

    // 2. Fallback to Environment Variables
    if (!adminData) {
      const validEmail = process.env.ADMIN_EMAIL || "admin@rubjob.com";
      const validPassword = process.env.ADMIN_PASSWORD || "admin123";

      if (email === validEmail && password === validPassword) {
        adminData = {
          name: "Master Admin",
          role: "super_admin",
          permissions: null,
          avatarUrl: null
        };
      }
    }

    if (adminData) {
      // Set HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set("admin_token", email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      return NextResponse.json({ 
        success: true, 
        name: adminData.name,
        role: adminData.role,
        permissions: adminData.permissions ? JSON.parse(adminData.permissions) : null,
        avatarUrl: adminData.avatarUrl
      });
    } else {
      return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
