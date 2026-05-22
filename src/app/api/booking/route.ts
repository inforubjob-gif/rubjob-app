import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { validateRequired, validateNumber, tryParseJSON } from "@/lib/validation";

export const runtime = "edge";

/**
 * POST /api/booking
 * Submits a new booking to Cloudflare D1 and sends LINE notification
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as any;
    
    // 1. Validate Inputs
    validateRequired(body.userId, "userId");
    // LINE User IDs start with 'U' and are 33 characters
    if (typeof body.userId !== "string" || !body.userId.startsWith("U") || body.userId.length !== 33) {
      return NextResponse.json({ error: "Invalid userId format" }, { status: 400 });
    }
    if (!body.storeId && !body.providerId) {
      return NextResponse.json({ error: "Either storeId or providerId is required" }, { status: 400 });
    }
    validateRequired(body.serviceId, "serviceId");
    validateRequired(body.items, "items");
    validateRequired(body.address, "address");
    
    const laundryFee = validateNumber(body.laundryFee, "laundryFee", { min: 0 });
    const deliveryFee = validateNumber(body.deliveryFee, "deliveryFee", { min: 0 });
    const totalPrice = validateNumber(body.totalPrice, "totalPrice", { min: 0 });
    const distanceKm = validateNumber(body.distanceKm, "distanceKm", { min: 0 });

    const items = tryParseJSON(body.items, "items");
    const address = tryParseJSON(body.address, "address");
    
    const { 
      userId, storeId, providerId, serviceId, paymentMethod, scheduledDate, customerNote, serviceDetails, discountCode, discountAmount
    } = body;

    // Access D1 from Cloudflare context
    const env = getRequestContext().env;
    const db = env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const orderId = `RJ-${nanoid(8).toUpperCase()}`;

    // Self-healing columns moved to db-init.ts

    // Self-healing: ensure duvet_washing exists in services
    if (serviceId === 'duvet_washing') {
      try {
        await db.prepare(`
          INSERT OR IGNORE INTO services (id, name, category, description, basePrice, unit, icon, estimatedDays, isActive)
          VALUES ('duvet_washing', 'ซักผ้านวม', 'laundry', 'บริการซักผ้านวม', 199, 'piece', 'duvet_washing', 2, 1)
        `).run();
      } catch(e) {
        console.error("Self-heal duvet_washing failed:", e);
      }
    }

    // Insert Order
    await db.prepare(`
      INSERT INTO orders (
        id, userId, storeId, providerId, serviceId, status, 
        laundryFee, deliveryFee, distanceKm, totalPrice, 
        paymentMethod, items, address, scheduledDate, customerNote, serviceDetails
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      userId,
      storeId || null,
      providerId || null,
      serviceId,
      "pending",
      laundryFee,
      deliveryFee,
      distanceKm,
      totalPrice,
      paymentMethod,
      JSON.stringify(items),
      JSON.stringify(address),
      scheduledDate,
      customerNote || null,
      serviceDetails || null
    ).run();

    // Handle Coupon Usage
    if (discountCode && discountAmount > 0) {
      try {
        const coupon = await db.prepare("SELECT id, code FROM coupons WHERE code = ?").bind(discountCode).first() as any;
        if (coupon) {
          // Increment used count
          await db.prepare("UPDATE coupons SET usedCount = usedCount + 1 WHERE id = ?").bind(coupon.id).run();
          // Record usage history
          await db.prepare(`
            INSERT INTO user_coupons_history (userId, couponId, couponCode, orderId, discount)
            VALUES (?, ?, ?, ?, ?)
          `).bind(userId, coupon.id, coupon.code, orderId, discountAmount).run();
        }
      } catch (err) {
        console.error("Failed to record coupon usage:", err);
      }
    }

    // Fetch service info for notification (check both standard services and gigs)
    let serviceName = "Gig Service";
    if (providerId) {
      const gig = await db.prepare("SELECT title as name FROM provider_services WHERE id = ?").bind(serviceId).first();
      if (gig) serviceName = gig.name as string;
    } else {
      const svc = await db.prepare("SELECT name FROM services WHERE id = ?").bind(serviceId).first();
      if (svc) serviceName = svc.name as string;
    }

    // Send LINE Notification (Async, don't block response)
    if (env.LINE_CHANNEL_ACCESS_TOKEN) {
      // NOTE: Customer confirmation + Driver broadcast happens AFTER payment
      // is confirmed via /api/payment/webhook (payment_intent.succeeded).
      // No cash payment exists — all orders require online payment first.

      // Broadcast to Admin Group (admin sees all bookings regardless of payment)
      const userRecord = await db.prepare("SELECT displayName FROM users WHERE id = ?").bind(userId).first() as { displayName: string };
      const customerName = userRecord?.displayName || "ลูกค้าทั่วไป";
      
      const { notifyAdminNewOrder } = await import("@/lib/support-notify");
      notifyAdminNewOrder({
        orderId,
        customerName,
        serviceName,
        totalPrice
      }, env).catch(err => console.error("Admin push error:", err));
    }

    return NextResponse.json({ 
      success: true, 
      orderId,
      message: "Booking submitted successfully" 
    });
  } catch (error: unknown) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
