import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/provider/seed
 * One-time seed: creates a test provider account
 * Remove this file after use in production
 */
export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Ensure table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS provider_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        phone TEXT DEFAULT '',
        pictureUrl TEXT DEFAULT '',
        lineUserId TEXT,
        skills TEXT DEFAULT '[]',
        pricing TEXT DEFAULT '{}',
        pricingUnit TEXT DEFAULT '{}',
        bio TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Insert test provider
    await db.prepare(`
      INSERT OR REPLACE INTO provider_users (id, email, password, name, phone, skills, pricing, pricingUnit, bio, status)
      VALUES (
        'provider_001',
        'provider@rubjob.com',
        '12345678',
        'ผู้ให้บริการทดสอบ',
        '0999999999',
        '["gecko_catcher","fortune_telling","companion_friend","life_management"]',
        '{"gecko_catcher":300,"fortune_telling":500,"companion_friend":250,"life_management":400}',
        '{"gecko_catcher":"ครั้ง","fortune_telling":"ครั้ง","companion_friend":"ชม.","life_management":"ชม."}',
        'พร้อมให้บริการทุกรูปแบบ ประสบการณ์กว่า 5 ปี ในการจัดการชีวิตให้คุณ',
        'active'
      )
    `).run();

    return NextResponse.json({ 
      success: true, 
      message: "Test provider created",
      credentials: {
        email: "provider@rubjob.com",
        password: "12345678"
      }
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
