import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function PUT(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    const body = await req.json() as any;
    const { providerId, lineId, name, bio } = body;

    // In a real app, we'd get providerId from session/cookie
    // For this prototype, we might pass it or use a known session pattern
    // Let's assume we need a way to identify the provider.
    
    // For now, let's look for a generic provider session or ID in the body
    if (!lineId && !name && !bio) return NextResponse.json({ error: "No data to update" }, { status: 400 });

    // Assuming we identify by email or id from the body for now
    // In production, this MUST be secured with JWT/Session
    const { email } = body; 
    if (!email) return NextResponse.json({ error: "Email required for update" }, { status: 400 });

    await db.prepare(`
      UPDATE provider_users 
      SET lineId = COALESCE(?, lineId),
          name = COALESCE(?, name),
          bio = COALESCE(?, bio),
          updatedAt = CURRENT_TIMESTAMP
      WHERE email = ?
    `).bind(lineId, name, bio, email).run();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
