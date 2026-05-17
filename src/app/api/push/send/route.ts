export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendPushNotification } from "@/lib/onesignal";

// Web Push using raw fetch (Edge Runtime compatible, no node crypto)
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: string) {
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
    const { title, body, url, targetUserIds, userType, sendToAll } = await req.json();
    
    if (!title || !body) {
      return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
    }

    const db = await getDb(req);
    const env = (globalThis as any).process?.env || {};
    const osAppId = env.ONESIGNAL_APP_ID || "";
    const osApiKey = env.ONESIGNAL_REST_API_KEY || "";

    // ===== Strategy 1: OneSignal (if configured) =====
    if (osAppId && osApiKey) {
      const result = await sendPushNotification(
        {
          title,
          message: body,
          url: url || "/",
          userIds: targetUserIds,
          sendToAll: sendToAll || !targetUserIds?.length,
        },
        osAppId,
        osApiKey
      );
      return NextResponse.json({ ...result, provider: "onesignal" });
    }

    // ===== Strategy 2: Fallback to Web Push =====
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
        await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(sub.endpoint).run();
      }
    }

    return NextResponse.json({ success: true, sent, failed, total: (subscriptions.results || []).length, provider: "webpush" });
  } catch (error: unknown) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
