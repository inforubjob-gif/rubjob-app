export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Save push subscription
export async function POST(req: NextRequest) {
  try {
    const { userId, userType, subscription } = await req.json();
    
    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb(req);

    // Upsert: delete old subscription for this endpoint, then insert new
    await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(subscription.endpoint).run();
    
    await db.prepare(`
      INSERT INTO push_subscriptions (userId, userType, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      userType || 'rubber',
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    ).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

// Delete push subscription (unsubscribe)
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

    const db = await getDb(req);
    await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(endpoint).run();
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
  }
}
