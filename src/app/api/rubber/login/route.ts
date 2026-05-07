import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as any;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Please provide email and password" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // Check Rubber Database
    const rubber = await db.prepare(`
      SELECT id, email, name, status, pictureUrl FROM rubber_users WHERE email = ? AND password = ?
    `).bind(email, password).first();

    if (rubber) {
      if (rubber.status === 'suspended') {
        return NextResponse.json({ success: false, error: "บัญชีของคุณมีความเคลื่อนไหวที่ผิดปกติ หรือถูกระงับชั่วคราว" }, { status: 403 });
      }

      const cookieStore = await cookies();
      const hostname = req.headers.get("host") || "";
      const rootDomain = ["rubjob-all.com", "rubjob.com", "rubjob-app.pages.dev", "lvh.me"].find(d => hostname.endsWith(d));

      cookieStore.set("rubber_token", String(rubber.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: rootDomain ? `.${rootDomain}` : undefined,
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      return NextResponse.json({ 
        success: true, 
        rubber: {
          id: rubber.id,
          name: rubber.name,
          email: rubber.email,
          pictureUrl: rubber.pictureUrl
        }
      });
    } else {
      return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
  } catch (err: any) {
    console.error("Rubber login error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
