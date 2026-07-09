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

    let adminData: Record<string, unknown> | null = null;

    try {
      const context = getRequestContext();
      const db = context?.env?.DB;
      
      if (db) {
        // 🛡️ Phase 3.4: Rate limiting — 5 attempts per 15 minutes
        const allowed = await checkRateLimit(db, email);
        if (!allowed) {
          return NextResponse.json({ success: false, error: "พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที" }, { status: 429 });
        }

        // Self-healing columns moved to db-init.ts (Phase 3.2)

        // Fetch admin by email only — verify password in application layer
        const admin = await db.prepare(
          "SELECT * FROM admin_users WHERE email = ?"
        ).bind(email).first() as Record<string, unknown> | null;

        if (admin && typeof admin.password === "string") {
          let passwordValid = false;

          if (isBcryptHash(admin.password)) {
            // Already hashed — use bcrypt compare
            try {
              passwordValid = await verifyPassword(password, admin.password);
            } catch (bcryptErr) {
              console.error(`⚠️ [AUTH] bcrypt.compare crashed for ${email}:`, bcryptErr);
              passwordValid = false;
            }
          } else {
            // Legacy plaintext — compare directly, then auto-hash (lazy migration)
            passwordValid = admin.password === password;
            if (passwordValid) {
              try {
                const hashed = await hashPassword(password);
                await db.prepare("UPDATE admin_users SET password = ? WHERE id = ?")
                  .bind(hashed, admin.id).run();
                console.log(`🔒 [AUTH] Auto-migrated admin ${email} password to bcrypt`);
              } catch (hashErr) {
                console.error(`⚠️ [AUTH] Failed to auto-migrate password for ${email}:`, hashErr);
              }
            }
          }

          if (passwordValid) {
            adminData = admin;
          } else {
            console.warn(`🔐 [AUTH] Password mismatch for ${email} (hash type: ${isBcryptHash(admin.password) ? 'bcrypt' : 'plaintext'})`);
          }
        }
      }
    } catch (dbErr) {
      console.warn("D1 access failed:", dbErr);
    }

    // Fallback removed for security — admin must exist in admin_users table

    if (adminData) {
      const cookieStore = await cookies();
      const hostname = req.headers.get("host") || "";
      const rootDomain = ["rubjob-all.com", "rubjob-app.pages.dev", "lvh.me"].find(d => hostname.endsWith(d));

      cookieStore.set("admin_token", email, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: rootDomain ? `.${rootDomain}` : undefined,
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      return NextResponse.json({ 
        success: true, 
        name: adminData.name,
        role: adminData.role,
        permissions: typeof adminData.permissions === "string" ? JSON.parse(adminData.permissions) : null,
        avatarUrl: adminData.avatarUrl
      });
    } else {
      // Record failed login attempt for rate limiting
      try {
        const db = getRequestContext()?.env?.DB;
        if (db) await recordLoginAttempt(db, email);
      } catch {}
      return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
