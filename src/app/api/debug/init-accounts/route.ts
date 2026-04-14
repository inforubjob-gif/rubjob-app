import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/debug/init-accounts
 * Resets the system to a clean state with exactly 1 user per role for testing.
 */
export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    // 1. Clear existing identifying data
    await db.batch([
      db.prepare("DELETE FROM admin_users"),
      db.prepare("DELETE FROM rider_users"),
      db.prepare("DELETE FROM stores"),
      db.prepare("DELETE FROM users"),
      db.prepare("DELETE FROM orders"),
      db.prepare("DELETE FROM rider_documents"),
      db.prepare("DELETE FROM store_services")
    ]);

    // 2. Create Master Admin
    await db.prepare(`
      INSERT INTO admin_users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).bind('ADM-001', 'admin@rubjob.com', 'password123', 'Master Admin', 'super_admin').run();

    // 3. Create Demo Customer (LIFF ID simulation)
    await db.prepare(`
      INSERT INTO users (id, displayName, pictureUrl, role, points)
      VALUES (?, ?, ?, ?, ?)
    `).bind('USER-001', 'Khun Customer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer', 'user', 100).run();

    // 4. Create Demo Store Owner
    await db.prepare(`
      INSERT INTO users (id, displayName, pictureUrl, role)
      VALUES (?, ?, ?, ?)
    `).bind('STORE-OWNER-001', 'Khun Store Owner', 'https://api.dicebear.com/7.x/avataaars/svg?seed=store', 'store_admin').run();

    // 5. Create Demo Store
    await db.prepare(`
      INSERT INTO stores (id, ownerId, name, address, lat, lng, isActive, serviceRadiusKm)
      VALUES (?, ?, ?, ?, ?, ?, 1, 10)
    `).bind('STORE-001', 'STORE-OWNER-001', 'Rubjob Flagship Store', 'Siam Square, Bangkok', 13.7444, 100.5312).run();

    // 6. Create Demo Rider
    await db.prepare(`
      INSERT INTO users (id, displayName, pictureUrl, role)
      VALUES (?, ?, ?, ?)
    `).bind('RIDER-001', 'Khun Rider', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rider', 'driver').run();

    // 6.2 Also add to rider_users for admin panel management
    await db.prepare(`
      INSERT INTO rider_users (id, email, password, name, phone, vehicleType, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind('RIDER-001', 'rider@rubjob.com', 'password123', 'Khun Rider', '0812345678', 'bike', 'active').run();

    // 7. Seed Initial System Settings
    const settings = [
      { key: 'is_open', value: 'true' },
      { key: 'gp_store_percent', value: '20' },
      { key: 'gp_rider_percent', value: '10' },
      { key: 'min_order_amount', value: '100' },
      { key: 'radius_km', value: '10' }
    ];

    for (const set of settings) {
      await db.prepare(`
        INSERT INTO system_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).bind(set.key, set.value).run();
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database initialized with 1 user per role",
      credentials: {
        admin: { email: "admin@rubjob.com", password: "password123" },
        mock_ids: {
          customer: "USER-001",
          store_owner: "STORE-OWNER-001",
          rider: "RIDER-001"
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
