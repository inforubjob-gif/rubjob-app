import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as any;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Please provide email and password" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    // Check Rider Database
    const rider = await db.prepare(`
      SELECT id, email, name, status, pictureUrl FROM rider_users WHERE email = ? AND password = ?
    `).bind(email, password).first();

    if (rider) {
      if (rider.status === 'suspended') {
        return NextResponse.json({ success: false, error: "บัญชีของคุณมีความเคลื่อนไหวที่ผิดปกติ หรือถูกระงับชั่วคราว" }, { status: 403 });
      }

      const cookieStore = await cookies();
      cookieStore.set("rider_token", String(rider.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });

      return NextResponse.json({ 
        success: true, 
        rider: {
          id: rider.id,
          name: rider.name,
          email: rider.email,
          pictureUrl: rider.pictureUrl
        }
      });
    } else {
      return NextResponse.json({ success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
  } catch (err: any) {
    console.error("Rider login error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
