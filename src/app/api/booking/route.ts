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
    validateRequired(body.storeId, "storeId");
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
      userId, storeId, serviceId, paymentMethod, scheduledDate 
    } = body;

    // Access D1 from Cloudflare context
    const env = getRequestContext().env;
    const db = env?.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database binding 'DB' not found" }, { status: 500 });
    }

    const orderId = `RJ-${nanoid(8).toUpperCase()}`;

    // Insert Order
    await db.prepare(`
      INSERT INTO orders (
        id, userId, storeId, serviceId, status, 
        laundryFee, deliveryFee, distanceKm, totalPrice, 
        paymentMethod, items, address, scheduledDate
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      orderId,
      userId,
      storeId,
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

    // Fetch service info for notification
    const service = await db.prepare("SELECT name FROM services WHERE id = ?").bind(serviceId).first();

    // Send LINE Notification (Async, don't block response)
    if (env.LINE_CHANNEL_ACCESS_TOKEN) {
      // 1. Notify Customer
      sendLinePush(
        userId, 
        [bookingConfirmationFlex(orderId, service?.name || "Service", totalPrice)],
        env.LINE_CHANNEL_ACCESS_TOKEN
      ).catch(err => console.error("LINE push error (customer):", err));

      // 2. Broadcast to eligible Riders
      // Fetch riders assigned to this store or area
      const riders = await db.prepare(`
        SELECT id FROM users 
        WHERE role = 'driver' AND (assignedStoreId = ? OR assignedStoreId IS NULL)
      `).bind(storeId).all();

      if (riders.results && riders.results.length > 0) {
        const riderNotifyMsg = {
          type: "text",
          text: `🚨 มีออเดอร์ใหม่เข้า! [${orderId}]\nบริการ: ${service?.name}\nร้าน: ${storeId}\nกดดูงานได้ที่หน้า Rider App ครับ`
        };

        // Send to each rider (Cloudflare Workers fetch limit might apply if too many, but for now it's okay for few riders)
        riders.results.forEach((rider: any) => {
          sendLinePush(rider.id, [riderNotifyMsg], env.LINE_CHANNEL_ACCESS_TOKEN)
            .catch(err => console.error(`LINE push error (rider ${rider.id}):`, err));
        });
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
