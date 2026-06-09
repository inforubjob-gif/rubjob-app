import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/rubber/forgot-password
 * 
 * Accepts { email } and:
 * 1. Looks up the Rubber by email
 * 2. Creates a reset token (expires in 15 min)
 * 3. Sends reset link via Email (always) + LINE (if linked)
 * 4. Rate limited: 3 requests per hour per email
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json() as { email: string };
    if (!email) {
      return NextResponse.json({ error: "กรุณากรอก Email" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Find rubber by email
    const rubber = await db.prepare(
      "SELECT id, email, name, lineUserId FROM rubber_users WHERE email = ?"
    ).bind(email.trim().toLowerCase()).first() as any;

    // Always return success to prevent email enumeration
    if (!rubber) {
      return NextResponse.json({ success: true, message: "หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน" });
    }

    // Rate limit: 3 requests per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentRequests = await db.prepare(
      "SELECT COUNT(*) as count FROM password_reset_tokens WHERE email = ? AND createdAt > ?"
    ).bind(email, oneHourAgo).first() as any;

    if (recentRequests && recentRequests.count >= 3) {
      return NextResponse.json({ success: true, message: "หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน" });
    }

    // Generate token
    const { nanoid } = await import("nanoid");
    const token = nanoid(32);
    const tokenId = `RST-${nanoid(8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    await db.prepare(`
      INSERT INTO password_reset_tokens (id, rubberId, email, token, status, expiresAt)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(tokenId, rubber.id, email, token, expiresAt).run();

    const resetLink = `https://rubber.rubjob-all.com/reset-password?token=${token}`;

    // 📧 Send Email (always)
    const resendKey = env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const { sendEmail, buildPasswordResetEmail } = await import("@/lib/email");
        const { subject, html } = buildPasswordResetEmail({ name: rubber.name || "Rubber", resetLink });
        await sendEmail({ to: email, subject, html, apiKey: resendKey });
        console.log(`[RESET] Email sent to ${email}`);
      } catch (e) {
        console.error("[RESET] Email send failed:", e);
      }
    }

    // 💬 Send LINE message (if linked)
    if (rubber.lineUserId) {
      try {
        const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER || env.LINE_CHANNEL_ACCESS_TOKEN;
        if (accessToken) {
          const { sendLinePush } = await import("@/lib/line");
          const { passwordResetFlex } = await import("@/lib/line");
          await sendLinePush(rubber.lineUserId, [passwordResetFlex(resetLink)], accessToken);
          console.log(`[RESET] LINE message sent to ${rubber.lineUserId}`);
        }
      } catch (e) {
        console.error("[RESET] LINE send failed:", e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "หากอีเมลนี้มีอยู่ในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน",
      hasLine: !!rubber.lineUserId 
    });
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
