import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { sendLinePush, bookingConfirmationFlex } from "@/lib/line";
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
      userId, storeId, providerId, serviceId, paymentMethod, scheduledDate 
    } = body;

    // Access D1 from Cloudflare context
    const env = getRequestContext().env;
    const db = env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const orderId = `RJ-${nanoid(8).toUpperCase()}`;

    // Self-healing: ensure providerId column exists
    try {
      await db.prepare("ALTER TABLE orders ADD COLUMN providerId TEXT").run();
    } catch(e) {}

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
        paymentMethod, items, address, scheduledDate
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      scheduledDate
    ).run();

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
      // 1. Notify Customer ONLY if payment is Cash
      if (paymentMethod === 'cash') {
        const { bookingConfirmationFlex } = await import("@/lib/line");
        sendLinePush(
          userId, 
          [bookingConfirmationFlex(orderId, serviceName, totalPrice)],
          env.LINE_CHANNEL_ACCESS_TOKEN
        ).catch(err => console.error("LINE push error (customer):", err));
      }

      // 2. Broadcast to Admin Group
      const userRecord = await db.prepare("SELECT displayName FROM users WHERE id = ?").bind(userId).first() as { displayName: string };
      const customerName = userRecord?.displayName || "ลูกค้าทั่วไป";
      
      const { notifyAdminNewOrder } = await import("@/lib/support-notify");
      notifyAdminNewOrder({
        orderId,
        customerName,
        serviceName,
        totalPrice
      }, env).catch(err => console.error("Admin push error:", err));

      // 3. Broadcast to Rubbers — send LINE Flex Message to eligible rubbers
      try {
        const { broadcastToEligibleRubbers } = await import("@/lib/dispatch");
        await broadcastToEligibleRubbers(
          db, env, orderId,
          body.address,
          deliveryFee,
          "pending"
        );
      } catch (err) {
        console.error("Rubber broadcast error:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      orderId,
      message: "Booking submitted successfully" 
    });
  } catch (error: any) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
