import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";

export const runtime = "edge";

/**
 * POST /api/rubber/reset-password
 * 
 * Accepts { token, newPassword } and:
 * 1. Validates the token (exists, not used, not expired)
 * 2. Hashes and updates the password
 * 3. Marks the token as used
 */
export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json() as { token: string; newPassword: string };

    if (!token || !newPassword) {
      return NextResponse.json({ error: "กรุณากรอก token และรหัสผ่านใหม่" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Find valid token
    const resetToken = await db.prepare(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND status = 'pending'"
    ).bind(token).first() as any;

    if (!resetToken) {
      return NextResponse.json({ error: "ลิงก์รีเซ็ตไม่ถูกต้อง หรือถูกใช้ไปแล้ว" }, { status: 400 });
    }

    // Check expiry
    if (new Date(resetToken.expiresAt) < new Date()) {
      // Mark as expired
      await db.prepare("UPDATE password_reset_tokens SET status = 'expired' WHERE id = ?").bind(resetToken.id).run();
      return NextResponse.json({ error: "ลิงก์รีเซ็ตหมดอายุแล้ว กรุณาขอใหม่อีกครั้ง" }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db.prepare(
      "UPDATE rubber_users SET password = ? WHERE id = ?"
    ).bind(hashedPassword, resetToken.rubberId).run();

    // Mark token as used
    await db.prepare(
      "UPDATE password_reset_tokens SET status = 'used' WHERE id = ?"
    ).bind(resetToken.id).run();

    // Also invalidate any other pending tokens for this rubber
    await db.prepare(
      "UPDATE password_reset_tokens SET status = 'expired' WHERE rubberId = ? AND status = 'pending' AND id != ?"
    ).bind(resetToken.rubberId, resetToken.id).run();

    console.log(`[RESET] Password reset successful for rubber ${resetToken.rubberId}`);

    return NextResponse.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จแล้ว!" });
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
