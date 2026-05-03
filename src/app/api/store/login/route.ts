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

    const context = getRequestContext();
    const db = context?.env?.DB;
    
    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 500 });
    }

    // Verify store credentials
    const store = await db.prepare(`
      SELECT id, name, email FROM stores WHERE email = ? AND password = ? AND isActive = 1
    `).bind(email, password).first() as any;

    if (store) {
      // Set HTTP-only cookie for store session
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
        store: {
          id: store.id,
          name: store.name,
          email: store.email
        }
      });
    } else {
      return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
  } catch (err) {
    console.error("Store login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
