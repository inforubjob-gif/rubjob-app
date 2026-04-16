import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { validateRequired, validatePhone } from "@/lib/validation";

export const runtime = "edge";

/**
 * POST /api/rider/setup
 * Handle rider registration and vehicle info
 */
export async function POST(req: Request) {
  try {
    const { userId, name, phone, vehicleType, licensePlate, idNumber } = await req.json() as any;
    
    validateRequired(userId, "userId");
    validateRequired(name, "Full Name");
    validateRequired(vehicleType, "Vehicle Type");
    validateRequired(licensePlate, "License Plate");
    if (phone) validatePhone(phone);

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });
    
    // Self-healing: Ensure required columns exist
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN rider_number INTEGER").run(); } catch(e) {}
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN bankName TEXT").run(); } catch(e) {}
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN accountNumber TEXT").run(); } catch(e) {}
    try { await db.prepare("ALTER TABLE rider_users ADD COLUMN accountName TEXT").run(); } catch(e) {}

    // 1. Create or Update Rider User record
    // We use rider_users table (id matches users.id)
    await db.prepare(`
      INSERT INTO rider_users (id, email, password, name, phone, vehicleType, licensePlate, idNumber, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        vehicleType = excluded.vehicleType,
        licensePlate = excluded.licensePlate,
        idNumber = excluded.idNumber
    `).bind(
      userId, 
      `${userId}@rubjob.com`, // placeholder email for riders if they don't have one
      "password_placeholder", // they auth via LIFF
      name, 
      phone || "", 
      vehicleType, 
      licensePlate, 
      idNumber || ""
    ).run();

    // 2. Update parent User role
    await db.prepare(`
      UPDATE users SET role = 'driver' WHERE id = ?
    `).bind(userId).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Rider setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
