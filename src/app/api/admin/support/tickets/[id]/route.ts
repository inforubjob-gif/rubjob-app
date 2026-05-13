import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json() as any;
    const { status } = body;

    if (!status || !['open', 'pending', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`
      UPDATE support_tickets 
      SET status = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(status, id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Resolve ticket error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
