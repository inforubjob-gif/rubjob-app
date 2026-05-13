import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function DELETE(req: Request, { params }: { params: { orderId: string } }) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    const orderId = params.orderId;

    await db.prepare(`
      UPDATE orders 
      SET rating = NULL, review_text = NULL 
      WHERE id = ?
    `).bind(orderId).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete review error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
