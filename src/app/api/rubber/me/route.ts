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

    // Ensure schema exists
    const { ensureSchema } = await import("@/lib/db-init");
    await ensureSchema(db);

    // Self-healing: ensure lineUserId column exists
    try { await db.prepare("ALTER TABLE rubber_users ADD COLUMN lineUserId TEXT").run(); } catch(e) {}

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
  } catch (err: any) {
    console.error("Fetch rubber profile error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
