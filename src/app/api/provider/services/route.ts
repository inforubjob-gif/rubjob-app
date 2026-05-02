import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/provider/services
 * Retrieve all custom gigs created by a specific provider.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json({ error: "providerId is required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });
    
    // Self-healing: ensure table exists
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS provider_services (
          id TEXT PRIMARY KEY,
          providerId TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT DEFAULT 'Stars',
          packages TEXT DEFAULT '[]',
          isActive BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (e) {}

    const { results } = await db.prepare(`
      SELECT * FROM provider_services WHERE providerId = ? ORDER BY createdAt DESC
    `).bind(providerId).all();

    return NextResponse.json({ services: results });
  } catch (error: any) {
    console.error("Fetch provider services error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/provider/services
 * Create or Update a Gig (Fastwork style)
 */
export async function POST(req: Request) {
  try {
    const { id, providerId, title, description, icon, packages, isActive } = await req.json() as any;

    if (!providerId || !title || !packages) {
      return NextResponse.json({ error: "providerId, title, and packages are required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });
    
    // Self-healing: ensure table exists
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS provider_services (
          id TEXT PRIMARY KEY,
          providerId TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT DEFAULT 'Stars',
          packages TEXT DEFAULT '[]',
          isActive BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (e) {}

    const gigId = id || `gig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const packagesJson = typeof packages === 'string' ? packages : JSON.stringify(packages);

    if (id) {
      // Update existing gig
      await db.prepare(`
        UPDATE provider_services
        SET title = ?, description = ?, icon = ?, packages = ?, isActive = ?
        WHERE id = ? AND providerId = ?
      `).bind(
        title, 
        description || '', 
        icon || 'Stars', 
        packagesJson, 
        isActive !== undefined ? isActive : 1, 
        id, 
        providerId
      ).run();
    } else {
      // Insert new gig
      await db.prepare(`
        INSERT INTO provider_services (id, providerId, title, description, icon, packages, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        gigId, 
        providerId, 
        title, 
        description || '', 
        icon || 'Stars', 
        packagesJson, 
        isActive !== undefined ? isActive : 1
      ).run();
    }

    return NextResponse.json({ success: true, id: gigId });
  } catch (error: any) {
    console.error("Save gig error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
