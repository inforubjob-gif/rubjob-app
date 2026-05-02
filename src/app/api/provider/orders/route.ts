import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

/**
 * GET /api/provider/orders?providerId=xxx
 * Fetch available + active direct-service orders for a provider
 * 
 * PUT /api/provider/orders
 * Accept a direct-service order
 */

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("provider_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Check provider exists and is active
    const provider = await db.prepare(`
      SELECT id, name, status, skills, pictureUrl FROM provider_users WHERE id = ?
    `).bind(token).first() as any;

    if (!provider) {
      return NextResponse.json({ status: "unregistered" });
    }

    if (provider.status !== "active") {
      return NextResponse.json({ 
        status: provider.status, 
        pictureUrl: provider.pictureUrl 
      });
    }

    const skills = JSON.parse(provider.skills || "[]") as string[];

    // Fetch available direct-service orders matching provider skills
    let available: any[] = [];
    if (skills.length > 0) {
      const placeholders = skills.map(() => "?").join(",");
      const availRes = await db.prepare(`
        SELECT o.id, o.serviceId, o.totalPrice, o.status, o.createdAt,
               u.displayName as customerName
        FROM orders o
        JOIN users u ON o.userId = u.id
        WHERE o.orderType = 'direct_service'
          AND o.status = 'pending'
          AND o.providerId IS NULL
          AND o.serviceId IN (${placeholders})
        ORDER BY o.createdAt DESC
        LIMIT 20
      `).bind(...skills).all();
      available = availRes.results || [];
    }

    // Fetch active/pending orders assigned to this provider (Direct Gig Bookings)
    const activeRes = await db.prepare(`
      SELECT o.id, o.serviceId, o.totalPrice, o.status, o.createdAt,
             u.displayName as customerName
      FROM orders o
      JOIN users u ON o.userId = u.id
      WHERE o.providerId = ?
        AND o.status IN ('pending', 'accepted', 'in_progress')
      ORDER BY o.createdAt DESC
    `).bind(token).all();

    return NextResponse.json({
      status: "active",
      pictureUrl: provider.pictureUrl,
      available: available,
      active: activeRes.results || [],
    });
  } catch (err: any) {
    console.error("Provider orders GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("provider_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { orderId, action } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Verify provider is active
    const provider = await db.prepare(
      "SELECT id, status FROM provider_users WHERE id = ?"
    ).bind(token).first() as any;

    if (!provider || provider.status !== "active") {
      return NextResponse.json({ error: "Provider not active" }, { status: 403 });
    }

    if (action === "accept") {
      // Accept a pending direct-service or directly-assigned gig order
      const order = await db.prepare(
        "SELECT id, status, providerId FROM orders WHERE id = ?"
      ).bind(orderId).first() as any;

      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (order.status !== "pending") return NextResponse.json({ error: "Order already taken" }, { status: 409 });

      await db.prepare(`
        UPDATE orders SET providerId = ?, status = 'accepted', updatedAt = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(token, orderId).run();

      return NextResponse.json({ success: true, status: "accepted" });

    } else if (action === "start") {
      // Mark order as in_progress
      await db.prepare(`
        UPDATE orders SET status = 'in_progress', updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND providerId = ?
      `).bind(orderId, token).run();

      return NextResponse.json({ success: true, status: "in_progress" });

    } else if (action === "complete") {
      // Mark order as completed + credit provider wallet
      await db.prepare(`
        UPDATE orders SET status = 'completed', updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND providerId = ?
      `).bind(orderId, token).run();

      // Credit provider wallet
      const order = await db.prepare("SELECT totalPrice FROM orders WHERE id = ?").bind(orderId).first() as any;
      if (order) {
        // Provider gets 85% (platform takes 15% GP)
        const gpPercent = 15;
        const providerEarnings = (order.totalPrice * (100 - gpPercent)) / 100;
        
        try {
          await db.prepare(`
            INSERT INTO provider_wallet (providerId, orderId, amount, type, status, createdAt)
            VALUES (?, ?, ?, 'job_completion', 'completed', CURRENT_TIMESTAMP)
          `).bind(token, orderId, providerEarnings).run();
        } catch (e) {
          // Table might not exist yet, create it
          await db.prepare(`
            CREATE TABLE IF NOT EXISTS provider_wallet (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              providerId TEXT NOT NULL,
              orderId TEXT,
              amount REAL NOT NULL DEFAULT 0,
              type TEXT DEFAULT 'job_completion',
              status TEXT DEFAULT 'completed',
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
          await db.prepare(`
            INSERT INTO provider_wallet (providerId, orderId, amount, type, status, createdAt)
            VALUES (?, ?, ?, 'job_completion', 'completed', CURRENT_TIMESTAMP)
          `).bind(token, orderId, providerEarnings).run();
        }
      }

      return NextResponse.json({ success: true, status: "completed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Provider orders PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
