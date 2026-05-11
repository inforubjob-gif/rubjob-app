import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    const rubbers = await db.prepare("SELECT id, name, email, lineUserId FROM rubber_users").all();
    
    return NextResponse.json({ 
      success: true, 
      rubbers: rubbers.results 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
