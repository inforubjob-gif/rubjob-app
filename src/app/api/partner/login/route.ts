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

    const context = getRequestContext();
    const db = context?.env?.DB;
    
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    // 1. Try to login as Store (partner-store)
    const store = await db.prepare(`
      SELECT id, name, email FROM stores WHERE email = ? AND password = ? AND isActive = 1
    `).bind(email, password).first() as any;

    if (store) {
      const cookieStore = await cookies();
      cookieStore.set("store_token", store.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      return NextResponse.json({ 
        success: true, 
        type: "store",
        partner: store
      });
    }

    // 2. Try to login as Provider (partner-service)
    // Self-healing table check
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS provider_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          status TEXT DEFAULT 'pending'
        )
      `).run();
    } catch (e) {}

    const provider = await db.prepare(`
      SELECT id, email, name, status FROM provider_users WHERE email = ? AND password = ?
    `).bind(email, password).first() as any;

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
        maxAge: 60 * 60 * 24 * 7
      });

      return NextResponse.json({ 
        success: true, 
        type: "service",
        partner: provider
      });
    }

    // Neither Store nor Provider found
    return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  } catch (err: any) {
    console.error("Partner unified login error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
