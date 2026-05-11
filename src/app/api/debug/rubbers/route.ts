import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getRequestContext().env.DB as any;
    const rubbers = await db.prepare("SELECT id, name, preferences FROM rubber_users").all();
    return NextResponse.json({ rubbers: rubbers.results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
