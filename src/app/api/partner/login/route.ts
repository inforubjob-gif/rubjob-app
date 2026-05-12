import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPassword, isBcryptHash, hashPassword } from "@/lib/password";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
    }

    const context = getRequestContext();
    const db = context?.env?.DB;
    
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    // 1. Try to login as Store (partner-store)
    const store = await db.prepare(
      "SELECT id, name, email, password FROM stores WHERE email = ? AND isActive = 1"
    ).bind(email).first() as Record<string, unknown> | null;

    if (store && typeof store.password === "string") {
      let passwordValid = false;
      if (isBcryptHash(store.password)) {
        passwordValid = await verifyPassword(password, store.password);
      } else {
        passwordValid = store.password === password;
        if (passwordValid) {
          const hashed = await hashPassword(password);
          await db.prepare("UPDATE stores SET password = ? WHERE id = ?")
            .bind(hashed, store.id).run();
        }
      }

      if (passwordValid) {
        const cookieStore = await cookies();
        cookieStore.set("store_token", String(store.id), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 24 * 7 // 1 week
        });

        return NextResponse.json({ 
          success: true, 
          type: "store",
          partner: { id: store.id, name: store.name, email: store.email }
        });
      }
    }

    // 2. Try to login as Provider (partner-service)
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

    const provider = await db.prepare(
      "SELECT id, email, name, status, password FROM provider_users WHERE email = ?"
    ).bind(email).first() as Record<string, unknown> | null;

    if (provider && typeof provider.password === "string") {
      let passwordValid = false;
      if (isBcryptHash(provider.password)) {
        passwordValid = await verifyPassword(password, provider.password);
      } else {
        passwordValid = provider.password === password;
        if (passwordValid) {
          const hashed = await hashPassword(password);
          await db.prepare("UPDATE provider_users SET password = ? WHERE id = ?")
            .bind(hashed, provider.id).run();
        }
      }

      if (passwordValid) {
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
          partner: { id: provider.id, name: provider.name, email: provider.email }
        });
      }
    }

    // Neither Store nor Provider found
    return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  } catch (err: unknown) {
    console.error("Partner unified login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
