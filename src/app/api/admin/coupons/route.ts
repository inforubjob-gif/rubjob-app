import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results } = await db.prepare(`
      SELECT * FROM coupons
      ORDER BY createdAt DESC
    `).all();

    return NextResponse.json({ coupons: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { code, type, value, minOrder, maxDiscount, expiryDate, usageLimit, isVisible } = await req.json() as any;
    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!code || !type || !value) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const id = `CPN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO coupons (id, code, type, value, minOrder, maxDiscount, expiryDate, usageLimit, isVisible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, code.toUpperCase(), type, value, minOrder || 0, maxDiscount || null, expiryDate || null, usageLimit || null, isVisible ? 1 : 0
    ).run();

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, isActive, isVisible } = await req.json() as any;
    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db.prepare(`
      UPDATE coupons 
      SET isActive = COALESCE(?, isActive),
          isVisible = COALESCE(?, isVisible)
      WHERE id = ?
    `).bind(
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      isVisible !== undefined ? (isVisible ? 1 : 0) : null,
      id
    ).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json() as any;
    const db = (req as any).context?.env?.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`DELETE FROM coupons WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
