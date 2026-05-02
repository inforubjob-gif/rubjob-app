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
      // 1. Notify Customer (Messaging API - Professional Flex Message)
      const { bookingConfirmationFlex } = await import("@/lib/line");
      sendLinePush(
        userId, 
        [bookingConfirmationFlex(orderId, serviceName, totalPrice)],
        env.LINE_CHANNEL_ACCESS_TOKEN
      ).catch(err => console.error("LINE push error (customer):", err));

      // 2. Broadcast to Riders Group (Now using In-App Polling & Web Push - 100% Free)
      // Since LINE Notify is discontinued, we rely on our built-in real-time update system
      // Riders who are "Online" will get a Sound Alert and In-App notification within 15s.
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
