import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/service-status
 * Public API — returns current service availability based on system_settings.
 * No authentication required.
 */
export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results } = await db.prepare(`
      SELECT key, value FROM system_settings 
      WHERE key IN ('is_open', 'service_open_time', 'service_close_time', 'service_extended', 'service_extended_close')
    `).all();

    const settings: Record<string, string> = {};
    (results as any[]).forEach((r: any) => { settings[r.key] = r.value; });

    const isOpen = settings.is_open !== "false";
    const openTime = settings.service_open_time || "08:00";
    const closeTime = settings.service_close_time || "18:00";
    const isExtended = settings.service_extended === "true";
    const extendedClose = settings.service_extended_close || "20:00";

    // Determine effective close time
    const effectiveClose = isExtended ? extendedClose : closeTime;

    // Check current time in Thailand timezone
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentHHMM = `${String(bangkokTime.getHours()).padStart(2, "0")}:${String(bangkokTime.getMinutes()).padStart(2, "0")}`;

    const withinHours = currentHHMM >= openTime && currentHHMM < effectiveClose;
    const isServiceAvailable = isOpen && withinHours;

    return NextResponse.json({
      available: isServiceAvailable,
      isOpen,
      withinHours,
      openTime,
      closeTime: effectiveClose,
      isExtended,
      currentTime: currentHHMM,
    });
  } catch (error: unknown) {
    console.error("Service status error:", error);
    return NextResponse.json({ available: true }); // Fail open
  }
}
