import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results: payouts } = await db.prepare(`
      SELECT p.*, 
             CASE 
               WHEN p.requesterType = 'store' THEN s.name
               WHEN p.requesterType = 'rider' THEN r.name
               ELSE 'Unknown'
             END as requesterName
      FROM payout_requests p
      LEFT JOIN stores s ON p.requesterId = s.id AND p.requesterType = 'store'
      LEFT JOIN rider_users r ON p.requesterId = r.id AND p.requesterType = 'rider'
      ORDER BY p.createdAt DESC
    `).all();

    return NextResponse.json({ payouts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
