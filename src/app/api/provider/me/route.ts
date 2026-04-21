import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("provider_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 not found" }, { status: 500 });
    }

    const provider = await db.prepare(`
      SELECT id, email, name, phone, pictureUrl, lineUserId, skills, pricing, pricingUnit, bio, status
      FROM provider_users WHERE id = ?
    `).bind(token).first();

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        pictureUrl: provider.pictureUrl,
        lineUserId: provider.lineUserId,
        skills: JSON.parse(provider.skills as string || "[]"),
        pricing: JSON.parse(provider.pricing as string || "{}"),
        pricingUnit: JSON.parse(provider.pricingUnit as string || "{}"),
        bio: provider.bio,
        status: provider.status,
      }
    });
  } catch (err: any) {
    console.error("Provider /me error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
