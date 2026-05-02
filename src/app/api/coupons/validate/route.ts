import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * POST /api/coupons/validate
 * Validates a coupon code against current order value and user role
 * 
 * Body: { code: string, subtotal: number, userRole?: string }
 * userRole: 'customer' | 'rider' | 'store' (defaults to 'customer')
 */
export async function POST(req: Request) {
  try {
    const { code, subtotal, userRole } = await req.json() as any;
    const role = userRole || 'customer';
    
    if (!code || subtotal === undefined) {
      return NextResponse.json({ error: "Code and Subtotal required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing
    try { await db.prepare("ALTER TABLE coupons ADD COLUMN eligibleRoles TEXT DEFAULT 'all'").run(); } catch (e) {}

    const coupon = await db.prepare(`
      SELECT * FROM coupons 
      WHERE code = ? AND isActive = 1
    `).bind(code.toUpperCase()).first() as any;

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found or inactive" }, { status: 404 });
    }

    // 1. Check Eligible Roles
    const eligibleRoles = coupon.eligibleRoles || 'all';
    if (eligibleRoles !== 'all') {
      const allowedRoles = eligibleRoles.split(',').map((r: string) => r.trim());
      if (!allowedRoles.includes(role)) {
        const roleLabels: Record<string, string> = {
          rider: 'ไรเดอร์',
          store: 'ร้านค้า', 
          customer: 'ลูกค้า'
        };
        const allowedLabels = allowedRoles.map((r: string) => roleLabels[r] || r).join(', ');
        return NextResponse.json({ 
          error: `คูปองนี้ใช้ได้เฉพาะ ${allowedLabels} เท่านั้น` 
        }, { status: 403 });
      }
    }

    // 2. Check Expiry
    if (coupon.expiryDate) {
      const expiry = new Date(coupon.expiryDate);
      if (expiry < new Date()) {
        return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
      }
    }

    // 3. Check Usage Limit
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    // 4. Check Minimum Order
    if (subtotal < coupon.minOrder) {
      return NextResponse.json({ 
        error: `Minimum order of ฿${coupon.minOrder} required to use this coupon` 
      }, { status: 400 });
    }

    // 5. Calculate Discount
    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    return NextResponse.json({ 
      success: true, 
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: Math.round(discount),
        eligibleRoles: coupon.eligibleRoles
      } 
    });

  } catch (error: any) {
    console.error("Coupon validation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
