import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const rubberId = await getRubberSession();

    if (!rubberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const rubber = await db.prepare(`
      SELECT id, name, email, status, pictureUrl, phone FROM rubber_users WHERE id = ?
    `).bind(rubberId).first();

    if (rubber) {
      return NextResponse.json({ 
        success: true, 
        rubber: {
          id: rubber.id,
          name: rubber.name,
          email: rubber.email,
          status: rubber.status,
          pictureUrl: rubber.pictureUrl,
          phone: rubber.phone
        }
      });
    } else {
      return NextResponse.json({ error: "Rubber not found" }, { status: 404 });
    }
  } catch (err: any) {
    console.error("Fetch rubber profile error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
