import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { sendLinePush } from "@/lib/line";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { message: string, target: string };
    const { message, target } = body;

    if (!message || !target) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    let accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!accessToken) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'").first() as any;
      if (setting?.value) accessToken = setting.value;
    }

    let rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
    if (!rubberToken) {
      const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_channel_access_token_rubber'").first() as any;
      if (setting?.value) rubberToken = setting.value;
    }

    let users = [];
    let activeToken = accessToken;

    // Determine target users
    if (target === "all_users") {
      const res = await db.prepare("SELECT id as lineUserId FROM users WHERE id IS NOT NULL").all();
      users = res.results;
      activeToken = accessToken;
    } else if (target === "rubbers" || target === "stores") {
      const table = target === "rubbers" ? "rubber_users" : "stores";
      const res = await db.prepare(`SELECT lineUserId FROM ${table} WHERE lineUserId IS NOT NULL`).all();
      users = res.results;
      activeToken = rubberToken || accessToken;
    } else {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    if (!activeToken) {
      return NextResponse.json({ error: "LINE Channel Access Token for this target is not set" }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "No users found for this target" }, { status: 404 });
    }

    const lineMessage = [
      {
        type: "text",
        text: message
      }
    ];

    let successCount = 0;
    let failCount = 0;

    // Send messages in background
    // LINE API limit is usually 500-1000 per push, but we will iterate. Note that push to multiple users should use multicast, but for simplicity here we push individually or you could use multicast.
    // For D1/Workers, we can't run too many parallel fetch requests without hitting subrequest limits.
    // It's better to use multicast if we have many users.
    const userIds = users.map((u: any) => u.lineUserId || u.id).filter(id => id && id.length > 5);
    
    // Multicast allows up to 500 users per request
    const chunkSize = 500;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      try {
        const response = await fetch("https://api.line.me/v2/bot/message/multicast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeToken}`,
          },
          body: JSON.stringify({
            to: chunk,
            messages: lineMessage,
          }),
        });

        if (response.ok) {
          successCount += chunk.length;
        } else {
          const err = await response.text();
          console.error("LINE Multicast Error:", err);
          failCount += chunk.length;
        }
      } catch (err) {
        console.error("Failed to send chunk:", err);
        failCount += chunk.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent: successCount, 
      failed: failCount,
      total: userIds.length 
    });

  } catch (error: any) {
    console.error("Broadcast error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
