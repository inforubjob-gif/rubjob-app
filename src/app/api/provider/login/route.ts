import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as any;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // Self-healing: ensure provider_users table exists
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS provider_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          phone TEXT DEFAULT '',
          pictureUrl TEXT DEFAULT '',
          lineUserId TEXT,
          skills TEXT DEFAULT '[]',
          pricing TEXT DEFAULT '{}',
          pricingUnit TEXT DEFAULT '{}',
          bio TEXT DEFAULT '',
          lineId TEXT DEFAULT '',
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (e) {}

    const provider = await db.prepare(`
      SELECT id, email, name, status, pictureUrl, skills, pricing, pricingUnit, bio 
      FROM provider_users WHERE email = ? AND password = ?
    `).bind(email, password).first();

    if (provider) {
      if (provider.status === 'suspended') {
        return NextResponse.json({ success: false, error: "บัญชีของคุณถูกระงับชั่วคราว" }, { status: 403 });
      }

      const cookieStore = await cookies();
      cookieStore.set("provider_token", String(provider.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      return NextResponse.json({ 
        success: true, 
        provider: {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          pictureUrl: provider.pictureUrl,
          skills: JSON.parse(provider.skills as string || "[]"),
          pricing: JSON.parse(provider.pricing as string || "{}"),
          pricingUnit: JSON.parse(provider.pricingUnit as string || "{}"),
          bio: provider.bio,
          status: provider.status,
        }
      });
    } else {
      return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
  } catch (err: any) {
    console.error("Provider login error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
