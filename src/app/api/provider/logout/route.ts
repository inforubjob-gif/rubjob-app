import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("provider_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ success: true });
}
