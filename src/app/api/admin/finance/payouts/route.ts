import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results: payouts } = await db.prepare(`
      SELECT p.*, 
             CASE 
               WHEN p.requesterType = 'store' THEN s.name
               WHEN p.requesterType = 'rubber' THEN r.name
               WHEN p.requesterType = 'provider' THEN u_sp.displayName
               WHEN p.requesterType = 'customer_refund' THEN COALESCE(u_cust.displayName, u_cust.nickname, 'ลูกค้า #' || SUBSTR(p.requesterId, -4))
               ELSE 'Unknown'
             END as requesterName,
             u_cust.pictureUrl as customerAvatar
      FROM payout_requests p
      LEFT JOIN stores s ON p.requesterId = s.id AND p.requesterType = 'store'
      LEFT JOIN rubber_users r ON p.requesterId = r.id AND p.requesterType = 'rubber'
      LEFT JOIN specialist_profiles sp ON p.requesterId = sp.id AND p.requesterType = 'provider'
      LEFT JOIN users u_sp ON sp.id = u_sp.id AND p.requesterType = 'provider'
      LEFT JOIN users u_cust ON p.requesterId = u_cust.id AND p.requesterType = 'customer_refund'
      ORDER BY p.createdAt DESC
    `).all();

    return NextResponse.json({ payouts });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, status, receiptUrl, notes } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id || !status) return NextResponse.json({ error: "Missing ID or status" }, { status: 400 });

    const processedAt = status === 'completed' || status === 'rejected' ? new Date().toISOString() : null;

    await db.prepare(`
      UPDATE payout_requests 
      SET status = ?, 
          receiptUrl = COALESCE(?, receiptUrl), 
          notes = COALESCE(?, notes),
          processedAt = COALESCE(?, processedAt)
      WHERE id = ?
    `).bind(status, receiptUrl || null, notes || null, processedAt, id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
