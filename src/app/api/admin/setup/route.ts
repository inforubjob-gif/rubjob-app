import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * EMERGENCY SETUP API
 * Accessing this route via GET will forcefully create/reset the Master Admin user.
 * DELETE THIS FILE IMMEDIATELY AFTER USE.
 */
export async function GET(req: Request) {
  try {
    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ error: "D1 Database 'DB' not found in environment" }, { status: 500 });
    }

    const adminEmail = "admin@rubjob.com";
    const adminPassword = "admin123";
    const adminName = "System Owner";
    const adminId = "emergency-" + Date.now();

    // 1. Force create table if it doesn't exist (Self-healing)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'admin',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 2. Insert or replace the master admin
    await db.prepare(`
      INSERT OR REPLACE INTO admin_users (id, email, password, name, role)
      VALUES (?, ?, ?, ?, 'super_admin')
    `).bind(adminId, adminEmail, adminPassword, adminName).run();

    return NextResponse.json({ 
      success: true, 
      message: "Master Admin user created or reset successfully",
      credentials: {
        email: adminEmail,
        password: adminPassword
      },
      action_required: "Please log in now, then ASK the AI to delete this setup file for security."
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
