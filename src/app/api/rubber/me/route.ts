import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const session = await getRubberSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rubberId = session.id;

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const rubber = await db.prepare(`
      SELECT r.id, r.name, r.email, r.status, r.pictureUrl, r.phone, r.lineUserId, r.vehicleType, r.bankName, r.accountNumber, u.displayName as lineDisplayName
      FROM rubber_users r
      LEFT JOIN users u ON r.lineUserId = u.id
      WHERE r.id = ?
    `).bind(rubberId).first() as any;

    if (rubber) {
      return NextResponse.json({ 
        success: true, 
        rubber: {
          id: rubber.id,
          name: rubber.name,
          email: rubber.email,
          status: rubber.status,
          pictureUrl: rubber.pictureUrl,
          phone: rubber.phone,
          vehicleType: rubber.vehicleType,
          bankName: rubber.bankName,
          accountNumber: rubber.accountNumber,
          lineUserId: rubber.lineUserId,
          lineDisplayName: rubber.lineDisplayName
        }
      });
    } else {
      return NextResponse.json({ error: "Rubber not found" }, { status: 404 });
    }
  } catch (err: unknown) {
    console.error("Fetch rubber profile error:", err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getRubberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rubberId = session.id;

    const payload = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    if (payload.action === 'unlink_line') {
      await db.prepare("UPDATE rubber_users SET lineUserId = NULL WHERE id = ?").bind(rubberId).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
