/**
 * Rubjob Email Utility — powered by Resend
 * 
 * Sends transactional emails via Resend API (Edge-compatible, no SDK needed).
 * Used for: Welcome emails, Rejection emails, Password reset links.
 */

const FROM_EMAIL = "Rubjob <no-reply@rubjob-all.com>";
const LINE_FRIEND_URL = "https://lin.ee/53cGCZyU";
const LINE_HELP_URL = "https://lin.ee/YvdzLRq";

// ─── Base send function ────────────────────────────────────────

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
}

export async function sendEmail({ to, subject, html, apiKey }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) {
    console.warn("[EMAIL] RESEND_API_KEY is not set. Skipping email.");
    return { success: false, error: "Missing API key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[EMAIL] Resend API error:", error);
      return { success: false, error };
    }

    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
    return { success: true };
  } catch (err) {
    console.error("[EMAIL] Send failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Email Templates ───────────────────────────────────────────

function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 20px; padding: 40px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .logo { text-align: center; margin-bottom: 28px; }
    .logo span { font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #f59e0b; text-transform: uppercase; }
    .logo sub { font-size: 10px; color: #94a3b8; font-weight: 800; letter-spacing: 3px; display: block; margin-top: 2px; }
    h1 { font-size: 22px; font-weight: 900; margin: 0 0 8px 0; color: #0f172a; }
    h2 { font-size: 16px; font-weight: 900; margin: 24px 0 12px 0; color: #334155; text-transform: uppercase; letter-spacing: 1px; }
    p { font-size: 14px; line-height: 1.7; margin: 0 0 16px 0; color: #475569; }
    .highlight { background: #fffbeb; border: 2px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
    .highlight p { margin: 0; font-weight: 700; color: #92400e; }
    .step { display: flex; align-items: flex-start; gap: 12px; margin: 12px 0; padding: 12px 16px; background: #f8fafc; border-radius: 12px; }
    .step-num { width: 28px; height: 28px; background: #f59e0b; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; flex-shrink: 0; }
    .step-text { font-size: 13px; line-height: 1.6; color: #334155; }
    .step-text strong { color: #0f172a; }
    .btn { display: inline-block; background: #00C300; color: #fff !important; text-decoration: none; padding: 16px 36px; border-radius: 14px; font-size: 15px; font-weight: 900; text-align: center; letter-spacing: 0.5px; margin: 8px 0; }
    .btn-container { text-align: center; margin: 28px 0; }
    .reason-list { margin: 12px 0; padding-left: 0; list-style: none; }
    .reason-list li { padding: 8px 14px; margin: 6px 0; background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; font-size: 13px; font-weight: 700; color: #991b1b; }
    .reason-list li::before { content: "⚠️ "; }
    .admin-note { background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
    .admin-note p { margin: 0; color: #0c4a6e; font-size: 13px; }
    .admin-note strong { color: #075985; }
    .footer { text-align: center; padding: 24px 0 0; border-top: 1px solid #e2e8f0; margin-top: 28px; }
    .footer p { font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 900; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <img src="https://rubjob-all.com/images/rubjob-complete_Vertical-text-color.png" alt="RUBJOB" width="120" style="display: block; margin: 0 auto;" />
      </div>
      ${content}
      <div class="footer">
        <p>ต้องการความช่วยเหลือ? <a href="${LINE_HELP_URL}" style="color: #00C300; text-decoration: none; font-weight: 900;">คลิกเพื่อติดต่อแอดมิน</a></p>
        <p style="margin-top: 8px;">© ${new Date().getFullYear()} Rubjob — Made in Bangkok 🇹🇭</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Welcome Email (Admin Approved) ────────────────────────────

interface WelcomeEmailData {
  name: string;
  email: string;
  displayId: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const subject = `🎉 ยินดีต้อนรับสู่ทีม RUBJOB! บัญชีของคุณได้รับการอนุมัติแล้ว`;

  const html = emailWrapper(`
    <h1>🎉 ยินดีต้อนรับ คุณ${data.name}!</h1>
    <p>บัญชีของคุณได้รับการตรวจสอบและ <strong>อนุมัติเรียบร้อยแล้ว</strong></p>
    
    <div class="highlight">
      <p>🆔 รหัส Rubber ของคุณ: <span class="badge">${data.displayId}</span></p>
    </div>

    <h2>📱 วิธีเริ่มต้นใช้งาน</h2>

    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text"><strong>เพิ่มเพื่อน LINE ของ Rubjob Rubber</strong><br>กดปุ่มด้านล่างเพื่อเข้าใช้งานระบบผ่าน LINE</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text"><strong>เข้าสู่ระบบ</strong><br>ใช้ Email: <strong>${data.email}</strong> และรหัสผ่านที่คุณตั้งไว้ตอนสมัคร</div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-text"><strong>เชื่อมต่อ LINE ในระบบ (สำคัญมาก!)</strong><br>ไปที่ <strong>โปรไฟล์ → เชื่อมต่อ LINE</strong> เพื่อผูกบัญชี LINE กับระบบ จะได้รับแจ้งเตือนงานใหม่ผ่าน LINE โดยอัตโนมัติ</div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-text"><strong>ตั้งค่า PIN กระเป๋าเงิน</strong><br>ไปที่ กระเป๋าเงิน → ตั้ง PIN 6 หลัก เพื่อความปลอดภัย</div>
    </div>
    <div class="step">
      <div class="step-num">5</div>
      <div class="step-text"><strong>เปิดสถานะ "พร้อมรับงาน"</strong><br>เปิดสวิตช์ที่หน้าหลักเพื่อเริ่มรับงานได้ทันที</div>
    </div>

    <div class="highlight">
      <p>🔗 <strong>ทำไมต้องเชื่อมต่อ LINE?</strong><br>เมื่อเชื่อมต่อ LINE แล้ว คุณจะได้รับแจ้งเตือนงานใหม่ทันที ไม่พลาดทุกออเดอร์!</p>
    </div>

    <div class="btn-container">
      <a href="${LINE_FRIEND_URL}" class="btn">🟢 เพิ่มเพื่อน LINE เพื่อเข้าใช้งาน</a>
    </div>

    <p style="text-align: center; font-size: 12px; color: #94a3b8;">เข้าใช้งานผ่าน LINE เท่านั้น</p>
  `);

  return { subject, html };
}

// ─── Rejection Email (Admin Rejected) ──────────────────────────

interface RejectionEmailData {
  name: string;
  reasons: string[];
  adminNote?: string;
}

export function buildRejectionEmail(data: RejectionEmailData): { subject: string; html: string } {
  const subject = `📋 แจ้งผลการตรวจสอบใบสมัคร Rubjob Rubber`;

  const reasonItems = data.reasons.map(r => `<li>${r}</li>`).join("");
  const adminNoteBlock = data.adminNote
    ? `<div class="admin-note"><p><strong>ข้อความจากแอดมิน:</strong><br>${data.adminNote}</p></div>`
    : "";

  const html = emailWrapper(`
    <h1>📋 แจ้งผลการตรวจสอบใบสมัคร</h1>
    <p>สวัสดี คุณ${data.name}</p>
    <p>ขออภัย ใบสมัครของคุณ <strong>ยังไม่ผ่านการตรวจสอบ</strong> เนื่องจากเหตุผลดังนี้:</p>

    <ul class="reason-list">
      ${reasonItems}
    </ul>

    ${adminNoteBlock}

    <h2>🔄 ขั้นตอนถัดไป</h2>
    
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text"><strong>แก้ไขข้อมูลที่ระบุ</strong><br>เตรียมเอกสารหรือข้อมูลที่ถูกต้องตามเหตุผลด้านบน</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text"><strong>ติดต่อแอดมิน</strong><br>ส่งข้อมูลที่แก้ไขแล้วผ่าน LINE เพื่อให้แอดมินตรวจสอบอีกครั้ง</div>
    </div>

    <div class="btn-container">
      <a href="${LINE_HELP_URL}" class="btn">💬 ติดต่อแอดมินผ่าน LINE</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; text-align: center;">หากมีข้อสงสัยเพิ่มเติม สามารถสอบถามผ่าน LINE ได้เลยครับ</p>
  `);

  return { subject, html };
}

// ─── Password Reset Email ──────────────────────────────────────

interface PasswordResetEmailData {
  name: string;
  resetLink: string;
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): { subject: string; html: string } {
  const subject = `🔐 ลิงก์ตั้งรหัสผ่านใหม่ — Rubjob`;

  const html = emailWrapper(`
    <h1>🔐 ตั้งรหัสผ่านใหม่</h1>
    <p>สวัสดี คุณ${data.name}</p>
    <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี Rubjob Rubber ของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>

    <div class="btn-container">
      <a href="${data.resetLink}" class="btn" style="background: #f59e0b;">🔑 ตั้งรหัสผ่านใหม่</a>
    </div>

    <div class="highlight">
      <p>⏰ ลิงก์นี้จะหมดอายุใน 15 นาที</p>
    </div>

    <p style="font-size: 12px; color: #94a3b8;">หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้ รหัสผ่านของคุณจะไม่ถูกเปลี่ยนแปลง</p>
  `);

  return { subject, html };
}
