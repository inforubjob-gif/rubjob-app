import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { sendLinePush, bookingConfirmationFlex } from "@/lib/line";

export const runtime = "edge";

/**
 * POST /api/booking
 * Submits a new booking to Cloudflare D1 and sends LINE notification
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as any;
    const { 
      userId, storeId, serviceId, items, address, paymentMethod, 
      laundryFee, deliveryFee, distanceKm, totalPrice, scheduledDate 
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
      sendLinePush(
        userId, 
        [bookingConfirmationFlex(orderId, service?.name || "Service", totalPrice)],
        env.LINE_CHANNEL_ACCESS_TOKEN
      ).catch(err => console.error("LINE push error:", err));
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
