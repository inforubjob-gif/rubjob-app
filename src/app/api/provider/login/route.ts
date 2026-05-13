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
      return NextResponse.json({ success: false, error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
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

    // Self-healing: provider_users table moved to db-init.ts


    // Fetch by email only — verify password in application layer
    const provider = await db.prepare(
      "SELECT id, email, name, status, pictureUrl, skills, pricing, pricingUnit, bio, password FROM provider_users WHERE email = ?"
    ).bind(email).first() as Record<string, unknown> | null;

    if (provider && typeof provider.password === "string") {
      let passwordValid = false;

      if (isBcryptHash(provider.password)) {
        passwordValid = await verifyPassword(password, provider.password);
      } else {
        // Lazy migration: plaintext → bcrypt
        passwordValid = provider.password === password;
        if (passwordValid) {
          const hashed = await hashPassword(password);
          await db.prepare("UPDATE provider_users SET password = ? WHERE id = ?")
            .bind(hashed, provider.id).run();
          console.log(`🔒 [AUTH] Auto-migrated provider ${email} password to bcrypt`);
        }
      }

      if (passwordValid) {
        if (provider.status === 'suspended') {
          return NextResponse.json({ success: false, error: "บัญชีของคุณถูกระงับชั่วคราว" }, { status: 403 });
        }

        const cookieStore = await cookies();
        const hostname = req.headers.get("host") || "";
        const rootDomain = ["rubjob-all.com", "rubjob.com", "rubjob-app.pages.dev", "lvh.me"].find(d => hostname.endsWith(d));

        cookieStore.set("provider_token", String(provider.id), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          domain: rootDomain ? `.${rootDomain}` : undefined,
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
      }
    }

    // Record failed login attempt for rate limiting
    await recordLoginAttempt(db, email);
    return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  } catch (err: unknown) {
    console.error("Provider login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
