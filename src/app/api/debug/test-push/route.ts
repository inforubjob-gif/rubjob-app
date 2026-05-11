import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/debug/test-push
 * 🔬 DEFINITIVE TEST — Sends a LINE push message directly to the rubber driver
 * and returns the RAW HTTP response from LINE API.
 * This bypasses ALL application logic to isolate the exact failure point.
 */
export async function GET(req: Request) {
  const env = getRequestContext().env;
  const db = env.DB;
  if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

  const report: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // Step 0: Ensure webhook_logs table exists
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id TEXT PRIMARY KEY,
          channel TEXT,
          payload TEXT,
          error TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      report.steps.push({ step: 0, action: "CREATE webhook_logs TABLE", result: "OK" });
    } catch (e: any) {
      report.steps.push({ step: 0, action: "CREATE webhook_logs TABLE", result: "SKIP", error: e?.message });
    }

    // Step 1: Get rubber driver info
    const rubber = await db.prepare(
      "SELECT id, name, lineUserId, phone FROM rubber_users LIMIT 1"
    ).first() as any;

    if (!rubber) {
      report.steps.push({ step: 1, action: "FIND RUBBER", result: "NO RUBBER FOUND" });
      return NextResponse.json(report);
    }

    report.steps.push({
      step: 1,
      action: "FIND RUBBER",
      result: "FOUND",
      data: { id: rubber.id, name: rubber.name, lineUserId: rubber.lineUserId, phone: rubber.phone }
    });

    if (!rubber.lineUserId) {
      report.steps.push({ step: 2, action: "CHECK lineUserId", result: "EMPTY — Cannot send push" });
      return NextResponse.json(report);
    }

    // Step 2: Get ALL possible tokens and show their prefixes
    const envToken = (env as any).LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
    const dbSetting = await db.prepare(
      "SELECT value FROM system_settings WHERE key = 'line_token_rubber'"
    ).first() as any;
    const dbToken = dbSetting?.value;

    // Also check ALL env vars that start with LINE_
    const envCustomer = (env as any).LINE_CHANNEL_ACCESS_TOKEN;
    const envHelp = (env as any).LINE_CHANNEL_ACCESS_TOKEN_HELP;

    report.steps.push({
      step: 2,
      action: "RESOLVE TOKENS",
      tokens: {
        env_RUBBER: envToken ? `SET (${envToken.length} chars) → ${envToken.substring(0, 10)}...${envToken.slice(-5)}` : "NOT_SET",
        db_rubber: dbToken ? `SET (${dbToken.length} chars) → ${dbToken.substring(0, 10)}...${dbToken.slice(-5)}` : "NOT_SET",
        env_CUSTOMER: envCustomer ? `SET (${envCustomer.length} chars) → ${envCustomer.substring(0, 10)}...${envCustomer.slice(-5)}` : "NOT_SET",
        env_HELP: envHelp ? `SET (${envHelp.length} chars) → ${envHelp.substring(0, 10)}...${envHelp.slice(-5)}` : "NOT_SET",
      }
    });

    const finalToken = envToken || dbToken;
    if (!finalToken) {
      report.steps.push({ step: 3, action: "TOKEN CHECK", result: "NO TOKEN AVAILABLE — Cannot send push" });
      return NextResponse.json(report);
    }

    report.steps.push({
      step: 3,
      action: "USING TOKEN",
      source: envToken ? "ENV (LINE_CHANNEL_ACCESS_TOKEN_RUBBER)" : "DB (line_token_rubber)",
      prefix: finalToken.substring(0, 10),
      suffix: finalToken.slice(-5),
      length: finalToken.length,
    });

    // Step 4: Send a simple text message via LINE Push API
    const linePayload = {
      to: rubber.lineUserId,
      messages: [{
        type: "text",
        text: `🧪 ทดสอบระบบแจ้งเตือน\n\nข้อความนี้ถูกส่งโดยตรงจาก LINE API\nเวลา: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}\n\nถ้าคุณเห็นข้อความนี้ แปลว่าระบบใช้งานได้ปกติครับ! ✅`
      }]
    };

    report.steps.push({
      step: 4,
      action: "SENDING LINE PUSH",
      to: rubber.lineUserId,
      url: "https://api.line.me/v2/bot/message/push",
    });

    const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${finalToken}`,
      },
      body: JSON.stringify(linePayload),
    });

    const lineStatus = lineRes.status;
    const lineHeaders: any = {};
    lineRes.headers.forEach((v, k) => { lineHeaders[k] = v; });

    let lineBody: any;
    try {
      lineBody = await lineRes.json();
    } catch {
      lineBody = await lineRes.text();
    }

    report.steps.push({
      step: 5,
      action: "LINE API RESPONSE",
      httpStatus: lineStatus,
      headers: lineHeaders,
      body: lineBody,
      success: lineStatus === 200,
    });

    // Step 5: Also try to verify the token by calling the bot info endpoint
    const botInfoRes = await fetch("https://api.line.me/v2/bot/info", {
      headers: { "Authorization": `Bearer ${finalToken}` },
    });
    const botInfo = await botInfoRes.json().catch(() => null);

    report.steps.push({
      step: 6,
      action: "BOT INFO (which OA is this token for?)",
      httpStatus: botInfoRes.status,
      botInfo: botInfo,
    });

    // Step 6: Log to webhook_logs
    try {
      await db.prepare(
        "INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)"
      ).bind(
        `TEST-PUSH-${Date.now()}`,
        'test_push',
        JSON.stringify({ lineStatus, lineBody, botInfo }),
        lineStatus !== 200 ? JSON.stringify(lineBody) : null
      ).run();
      report.steps.push({ step: 7, action: "LOG TO DB", result: "OK" });
    } catch (e: any) {
      report.steps.push({ step: 7, action: "LOG TO DB", result: "FAIL", error: e?.message });
    }

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    report.steps.push({ step: "ERROR", error: error.message, stack: error.stack });
    return NextResponse.json(report, { status: 500 });
  }
}
