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

    // Self-healing: ensure all columns exist

    const { results } = await db.prepare(`
      SELECT * FROM coupons
      ORDER BY createdAt DESC
    `).all();

    return NextResponse.json({ coupons: results });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { code, type, value, minOrder, maxDiscount, expiryDate, usageLimit, isVisible, title, description, eligibleRoles } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing

    if (!code || !type || !value) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const id = `CPN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO coupons (id, code, type, value, minOrder, maxDiscount, expiryDate, usageLimit, isVisible, title, description, eligibleRoles)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, code.toUpperCase(), type, value, minOrder || 0, maxDiscount || null, expiryDate || null, usageLimit || null, isVisible ? 1 : 0, title || null, description || null, eligibleRoles || 'all'
    ).run();

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    if (((error instanceof Error) ? safeError(error) : "").includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, code, type, value, minOrder, maxDiscount, expiryDate, usageLimit, isActive, isVisible, title, description, eligibleRoles } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Handle full update vs partial toggle
    if (code !== undefined || type !== undefined || value !== undefined) {
      await db.prepare(`
        UPDATE coupons 
        SET code = ?,
            type = ?,
            value = ?,
            minOrder = ?,
            maxDiscount = ?,
            expiryDate = ?,
            usageLimit = ?,
            isActive = COALESCE(?, isActive),
            isVisible = COALESCE(?, isVisible),
            title = ?,
            description = ?,
            eligibleRoles = COALESCE(?, eligibleRoles)
        WHERE id = ?
      `).bind(
        code?.toUpperCase(),
        type,
        value,
        minOrder,
        maxDiscount || null,
        expiryDate || null,
        usageLimit || null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        isVisible !== undefined ? (isVisible ? 1 : 0) : null,
        title || null,
        description || null,
        eligibleRoles || null,
        id
      ).run();
    } else {
      // Partial toggle for performance/legacy
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
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (((error instanceof Error) ? safeError(error) : "").includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    await db.prepare(`DELETE FROM coupons WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
