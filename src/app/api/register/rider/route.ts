import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { validateRequired, validatePhone } from "@/lib/validation";

export const runtime = "edge";

/**
 * POST /api/register/rider
 * Public endpoint for unauthenticated rider registration
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json() as any;
    const { name, phone, email, vehicleType, licensePlate, idNumber, documents } = payload;
    
    validateRequired(name, "Full Name");
    validateRequired(phone, "Phone Number");
    validatePhone(phone);
    validateRequired(vehicleType, "Vehicle Type");
    validateRequired(licensePlate, "License Plate");

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // 1. Generate a unique ID for this unauthenticated application
    const tempId = `RDR-REG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const userEmail = email || `${tempId}@rubjob.com`;

    // 2. Create entry in users table (base user record)
    await db.prepare(`
      INSERT INTO users (id, displayName, phone, role)
      VALUES (?, ?, ?, 'driver')
    `).bind(tempId, name, phone).run();

    // 3. Create entry in rider_users table (rider-specific data)
    await db.prepare(`
      INSERT INTO rider_users (id, email, password, name, phone, vehicleType, licensePlate, idNumber, status)
      VALUES (?, ?, 'pending_verification', ?, ?, ?, ?, ?, 'pending')
    `).bind(tempId, userEmail, name, phone, vehicleType, licensePlate, idNumber || "").run();

    // 4. Handle Documents (if provided as Base64)
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await db.prepare(`
          INSERT INTO rider_documents (id, riderId, type, url, status)
          VALUES (?, ?, ?, ?, 'pending')
        `).bind(docId, tempId, doc.type, doc.url, 'pending').run();
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Application submitted successfully",
      applicationId: tempId 
    });
  } catch (error: any) {
    console.error("Public Rider Registration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
