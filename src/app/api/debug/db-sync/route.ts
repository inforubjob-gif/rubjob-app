import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/debug/db-sync
 * Synchronizes the D1 database with the schema defined in db/schema.sql
 */
export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB binding not found" }, { status: 500 });

    // In Next.js on Pages, we might not have 'fs' access easily at runtime 
    // depending on how it's bundled. However, we can hardcode the schema 
    // or try to fetch it if it's served as a static asset.
    // Given the environment, it's safer to include the critical table definitions 
    // directly here to ensure this tool ALWAYS works.

    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT, role TEXT DEFAULT 'admin', createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS rider_users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT, phone TEXT, vehicleType TEXT, status TEXT DEFAULT 'active', address TEXT, idNumber TEXT, licensePlate TEXT, emergencyContact TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS rider_documents (id TEXT PRIMARY KEY, riderId TEXT NOT NULL, type TEXT NOT NULL, status TEXT DEFAULT 'pending', url TEXT, notes TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (riderId) REFERENCES rider_users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, displayName TEXT, pictureUrl TEXT, phone TEXT, role TEXT DEFAULT 'user', assignedStoreId TEXT, points INTEGER DEFAULT 0, preferences TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, name TEXT NOT NULL, address TEXT NOT NULL, lat REAL, lng REAL, serviceRadiusKm REAL DEFAULT 5, baseDeliveryFee REAL DEFAULT 0, extraFeePerKm REAL DEFAULT 10, phone TEXT, isActive INTEGER DEFAULT 1, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (ownerId) REFERENCES users(id));`,
      // Migration: Add phone to stores if it doesn't exist
      `ALTER TABLE stores ADD COLUMN phone TEXT;`,
      // Migration: Add rider_number to rider_users
      `ALTER TABLE rider_users ADD COLUMN rider_number INTEGER;`,
      `CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT, basePrice REAL NOT NULL, unit TEXT NOT NULL, icon TEXT, estimatedDays INTEGER, isActive INTEGER DEFAULT 1);`,
      `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, userId TEXT NOT NULL, storeId TEXT NOT NULL, serviceId TEXT NOT NULL, status TEXT NOT NULL, laundryFee REAL NOT NULL, deliveryFee REAL NOT NULL, distanceKm REAL, totalPrice REAL NOT NULL, paymentMethod TEXT NOT NULL, paymentStatus TEXT DEFAULT 'pending', items TEXT, address TEXT, scheduledDate TEXT, pickupDriverId TEXT, deliveryDriverId TEXT, staffNote TEXT, serviceDetails TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (userId) REFERENCES users(id), FOREIGN KEY (storeId) REFERENCES stores(id), FOREIGN KEY (serviceId) REFERENCES services(id), FOREIGN KEY (pickupDriverId) REFERENCES users(id), FOREIGN KEY (deliveryDriverId) REFERENCES users(id));`,
      `CREATE TABLE IF NOT EXISTS addresses (id TEXT PRIMARY KEY, userId TEXT NOT NULL, label TEXT NOT NULL, details TEXT, note TEXT, lat REAL, lng REAL, isDefault INTEGER DEFAULT 0, FOREIGN KEY (userId) REFERENCES users(id));`,
      `CREATE TABLE IF NOT EXISTS coupons (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL, value REAL NOT NULL, minOrder REAL DEFAULT 0, maxDiscount REAL, expiryDate TEXT, usageLimit INTEGER, usedCount INTEGER DEFAULT 0, isVisible INTEGER DEFAULT 1, isActive INTEGER DEFAULT 1, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS store_services (storeId TEXT NOT NULL, serviceId TEXT NOT NULL, price REAL, PRIMARY KEY (storeId, serviceId), FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE, FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS payout_requests (id TEXT PRIMARY KEY, requesterId TEXT NOT NULL, requesterType TEXT NOT NULL, amount REAL NOT NULL, bankName TEXT NOT NULL, accountNumber TEXT NOT NULL, accountName TEXT NOT NULL, status TEXT DEFAULT 'pending', receiptUrl TEXT, notes TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, processedAt DATETIME);`,
      `CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, userId TEXT NOT NULL, channel TEXT NOT NULL, status TEXT DEFAULT 'open', subject TEXT, assignedAdminId TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (userId) REFERENCES users(id));`,
      `CREATE TABLE IF NOT EXISTS support_messages (id TEXT PRIMARY KEY, ticketId TEXT NOT NULL, senderType TEXT NOT NULL, senderId TEXT NOT NULL, content TEXT NOT NULL, contentType TEXT DEFAULT 'text', createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (ticketId) REFERENCES support_tickets(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT, type TEXT, description TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP);`
    ];

    const results = [];
    for (const sql of schemaStatements) {
      try {
        await db.prepare(sql).run();
        results.push({ sql: sql.substring(0, 50) + "...", status: "success" });
      } catch (e: any) {
        results.push({ sql: sql.substring(0, 50) + "...", status: "error", message: e.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database synchronization completed",
      details: results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
