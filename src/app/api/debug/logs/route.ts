import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getRequestContext().env.DB as any;
    const logs = await db.prepare("SELECT * FROM webhook_logs WHERE channel = 'dispatch_fail' ORDER BY createdAt DESC LIMIT 5").all();
    return NextResponse.json({ logs: logs.results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
