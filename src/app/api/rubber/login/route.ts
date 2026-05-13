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

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // 🛡️ Phase 3.4: Rate limiting — 5 attempts per 15 minutes
    const allowed = await checkRateLimit(db, email);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที" }, { status: 429 });
    }

    // Fetch by email only — verify password in application layer
    const rubber = await db.prepare(
      "SELECT id, email, password, name, status, pictureUrl FROM rubber_users WHERE email = ?"
    ).bind(email).first() as Record<string, unknown> | null;

    if (rubber && typeof rubber.password === "string") {
      let passwordValid = false;

      if (isBcryptHash(rubber.password)) {
        passwordValid = await verifyPassword(password, rubber.password);
      } else {
        // Lazy migration: plaintext → bcrypt
        passwordValid = rubber.password === password;
        if (passwordValid) {
          const hashed = await hashPassword(password);
          await db.prepare("UPDATE rubber_users SET password = ? WHERE id = ?")
            .bind(hashed, rubber.id).run();
          console.log(`🔒 [AUTH] Auto-migrated rubber ${email} password to bcrypt`);
        }
      }

      if (passwordValid) {
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
      }
    }

    // Record failed login attempt for rate limiting
    await recordLoginAttempt(db, email);
    return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  } catch (err: unknown) {
    console.error("Rubber login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
