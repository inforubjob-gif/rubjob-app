import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getProviderSession } from "@/lib/auth-server";

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
    const token = await getProviderSession();
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
    const token = await getProviderSession();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { orderId, action } = await req.json() as any;
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
      // Mark order as completed
      await db.prepare(`
        UPDATE orders SET status = 'completed', updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND providerId = ?
      `).bind(orderId, token).run();

      return NextResponse.json({ success: true, status: "completed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Provider orders PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
