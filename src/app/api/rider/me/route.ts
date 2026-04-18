import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRiderSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const riderId = await getRiderSession();

    if (!riderId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const rider = await db.prepare(`
      SELECT id, name, email, status, pictureUrl, phone FROM rider_users WHERE id = ?
    `).bind(riderId).first();

    if (rider) {
      return NextResponse.json({ 
        success: true, 
        rider: {
          id: rider.id,
          name: rider.name,
          email: rider.email,
          status: rider.status,
          pictureUrl: rider.pictureUrl,
          phone: rider.phone
        }
      });
    } else {
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });
    }
  } catch (err: any) {
    console.error("Fetch rider profile error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
