import { safeError } from "@/lib/api-utils";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/payment/config
 * Returns the payment gateway type (no client-side key needed for Beam)
 */
export async function GET() {
  try {
    return NextResponse.json({ gateway: "beam" });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
