import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { validateRequired, validatePhone } from "@/lib/validation";

export const runtime = "edge";

/**
 * POST /api/rubber/setup
 * Handle rubber registration and vehicle info
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

    // 1. Create or Update Rubber User record
    // We use rubber_users table (id matches users.id)
    await db.prepare(`
      INSERT INTO rubber_users (id, email, password, name, phone, vehicleType, licensePlate, idNumber, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        vehicleType = excluded.vehicleType,
        licensePlate = excluded.licensePlate,
        idNumber = excluded.idNumber
    `).bind(
      userId, 
      `${userId}@rubjob.com`, // placeholder email for rubbers if they don't have one
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
  } catch (error: unknown) {
    console.error("Rubber setup error:", error);
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
