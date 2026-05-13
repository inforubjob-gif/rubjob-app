import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPassword, isBcryptHash, hashPassword } from "@/lib/password";
import { checkRateLimit, recordLoginAttempt } from "@/lib/rate-limit";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Please provide email and password" }, { status: 400 });
    }

    const context = getRequestContext();
    const db = context?.env?.DB;
    
    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 500 });
    }

    // 🛡️ Phase 3.4: Rate limiting — 5 attempts per 15 minutes
    const allowed = await checkRateLimit(db, email);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที" }, { status: 429 });
    }

    // Fetch by email only — verify password in application layer
    const store = await db.prepare(
      "SELECT id, name, email, password FROM stores WHERE email = ? AND isActive = 1"
    ).bind(email).first() as Record<string, unknown> | null;

    if (store && typeof store.password === "string") {
      let passwordValid = false;

      if (isBcryptHash(store.password)) {
        passwordValid = await verifyPassword(password, store.password);
      } else {
        // Lazy migration: plaintext → bcrypt
        passwordValid = store.password === password;
        if (passwordValid) {
          const hashed = await hashPassword(password);
          await db.prepare("UPDATE stores SET password = ? WHERE id = ?")
            .bind(hashed, store.id).run();
          console.log(`🔒 [AUTH] Auto-migrated store ${email} password to bcrypt`);
        }
      }

      if (passwordValid) {
        const cookieStore = await cookies();
        const hostname = req.headers.get("host") || "";
        const rootDomain = ["rubjob-all.com", "rubjob.com", "rubjob-app.pages.dev", "lvh.me"].find(d => hostname.endsWith(d));

        cookieStore.set("store_token", String(store.id), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          domain: rootDomain ? `.${rootDomain}` : undefined,
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
      }
    }

    // Record failed login attempt for rate limiting
    await recordLoginAttempt(db, email);
    return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  } catch (err) {
    console.error("Store login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
