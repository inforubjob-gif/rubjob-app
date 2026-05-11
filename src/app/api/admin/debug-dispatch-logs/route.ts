import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    const logs = await db.prepare("SELECT * FROM webhook_logs WHERE id LIKE 'DISPATCH-%' OR id LIKE 'FILTER-%' ORDER BY createdAt DESC LIMIT 50").all();
    
    return NextResponse.json({ 
      success: true, 
      count: logs.results?.length || 0,
      logs: logs.results 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
