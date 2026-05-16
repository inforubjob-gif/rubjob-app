export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

// Web Push using raw fetch (Edge Runtime compatible, no node crypto)
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  // For Cloudflare Workers / Edge Runtime, we use a lightweight approach
  // The service worker will handle the notification display
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: payload,
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Send push to all rubber users (or specific ones)
export async function POST(req: NextRequest) {
  try {
    const { title, body, url, targetUserIds, userType } = await req.json();
    
    if (!title || !body) {
      return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
    }

    const db = await getDb(req);

    let subscriptions;
    if (targetUserIds && targetUserIds.length > 0) {
      const placeholders = targetUserIds.map(() => "?").join(",");
      subscriptions = await db.prepare(
        `SELECT * FROM push_subscriptions WHERE userId IN (${placeholders}) AND userType = ?`
      ).bind(...targetUserIds, userType || 'rubber').all();
    } else {
      subscriptions = await db.prepare(
        `SELECT * FROM push_subscriptions WHERE userType = ?`
      ).bind(userType || 'rubber').all();
    }

    const payload = JSON.stringify({ title, body, url: url || "/" });
    let sent = 0;
    let failed = 0;

    for (const sub of (subscriptions.results || [])) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint as string, p256dh: sub.p256dh as string, auth: sub.auth as string },
        payload
      );
      if (success) {
        sent++;
      } else {
        failed++;
        // Remove invalid subscriptions
        await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(sub.endpoint).run();
      }
    }

    return NextResponse.json({ success: true, sent, failed, total: (subscriptions.results || []).length });
  } catch (error: unknown) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
