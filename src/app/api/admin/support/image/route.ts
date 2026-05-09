import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");
    const channel = searchParams.get("channel"); // "regular_line" or "help_line" or "in_app"

    if (!messageId) {
      return new Response("Missing messageId", { status: 400 });
    }

    // Determine which LINE channel token to use
    let tokenStr = "";
    if (channel && channel.includes("line")) {
      const channelType = channel.replace("_line", ""); // 'regular' or 'help'
      const db = getRequestContext().env.DB;
      const channelKeyToken = `line_token_${channelType}`;
      
      if (db) {
        const result = await db.prepare(`SELECT value FROM system_settings WHERE key = ?`).bind(channelKeyToken).first() as { value: string } | null;
        tokenStr = result?.value || (getRequestContext().env as any)[`LINE_CHANNEL_ACCESS_TOKEN_${channelType.toUpperCase()}`] || (getRequestContext().env as any).LINE_CHANNEL_ACCESS_TOKEN;
      } else {
        tokenStr = (getRequestContext().env as any)[`LINE_CHANNEL_ACCESS_TOKEN_${channelType.toUpperCase()}`] || (getRequestContext().env as any).LINE_CHANNEL_ACCESS_TOKEN;
      }
    } else {
      // Default fallback
      tokenStr = (getRequestContext().env as any).LINE_CHANNEL_ACCESS_TOKEN;
    }

    if (!tokenStr) {
      return new Response("LINE Token not configured", { status: 500 });
    }

    // Fetch the image from LINE API
    const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      headers: {
        Authorization: `Bearer ${tokenStr}`
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch LINE image: ${response.status} ${response.statusText}`);
      return new Response("Failed to fetch image", { status: response.status });
    }

    // Return the image blob directly
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      }
    });

  } catch (error: any) {
    console.error("Support image proxy error:", error);
    return new Response(error.message, { status: 500 });
  }
}
