import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { userId, subscription } = await request.json() as any;
    const env = (getRequestContext() as any).env;
    const db = env.DB;

    // We can store this in the 'preferences' field of the users table for now
    // or create a new table. Let's update preferences.
    const user = await db.prepare("SELECT preferences FROM users WHERE id = ?")
      .bind(userId)
      .first();

    let prefs = {};
    if (user?.preferences) {
      prefs = JSON.parse(user.preferences);
    }

    const updatedPrefs = {
      ...prefs,
      pushSubscription: subscription
    };

    await db.prepare("UPDATE users SET preferences = ? WHERE id = ?")
      .bind(JSON.stringify(updatedPrefs), userId)
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscription error:", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
