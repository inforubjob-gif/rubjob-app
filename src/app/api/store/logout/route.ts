import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("store_token");
  return NextResponse.json({ success: true });
}
