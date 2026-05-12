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

    return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  } catch (err: unknown) {
    console.error("Provider login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
