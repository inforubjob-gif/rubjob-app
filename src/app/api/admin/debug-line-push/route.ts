import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { sendLinePush } from "@/lib/line";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    const env = getRequestContext().env as any;
    
    // Get token
    let rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
    if (!rubberToken) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_token_rubber'").first() as any;
      if (setting?.value) rubberToken = setting.value;
    }

    if (!rubberToken) {
      return NextResponse.json({ error: "No Rubber LINE Token found" }, { status: 400 });
    }

    // Get all rubbers with lineUserId
    const rubbers = await db.prepare("SELECT id, name, lineUserId FROM rubber_users WHERE lineUserId IS NOT NULL").all();
    
    if (!rubbers.results || rubbers.results.length === 0) {
      return NextResponse.json({ error: "No rubbers with lineUserId found. Please Link LINE first." }, { status: 400 });
    }

    const results = [];
    
    for (const r of rubbers.results as any[]) {
      try {
        const response = await sendLinePush(
          r.lineUserId,
          [{ type: "text", text: `ทดสอบระบบแจ้งเตือนถึง ${r.name || 'คุณ'}` }],
          rubberToken
        );
        results.push({ id: r.id, lineUserId: r.lineUserId, success: true, response });
      } catch (err: any) {
        results.push({ id: r.id, lineUserId: r.lineUserId, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      token_length: rubberToken.length,
      token_prefix: rubberToken.substring(0, 5) + '...',
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
