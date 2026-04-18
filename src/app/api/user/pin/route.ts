import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRiderSession, getStoreSession } from "@/lib/auth-server";

export const runtime = "edge";

/**
 * Hash a 6-digit PIN using SHA-256 (Web Crypto API)
 */
async function hashPin(pin: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * GET /api/user/pin?type=...
 * Check if the user has a PIN set
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'rider' or 'store'
    
    const context = getRequestContext();
    const db = context.env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    let userId: string | null = null;

    if (type === "rider") {
      userId = await getRiderSession();
    } else if (type === "store") {
      const storeId = await getStoreSession();
      if (storeId) {
        const store = await db.prepare("SELECT ownerId FROM stores WHERE id = ?").bind(storeId).first() as any;
        userId = store?.ownerId || null;
      }
    }

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.prepare("SELECT walletPin FROM users WHERE id = ?").bind(userId).first() as any;
    
    return NextResponse.json({ 
      success: true, 
      hasPin: !!user?.walletPin 
    });
  } catch (error: any) {
    console.error("PIN check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/user/pin
 * Setup or Verify a PIN
 */
export async function POST(req: Request) {
  try {
    const { action, pin, type } = await req.json() as any;
    
    const context = getRequestContext();
    const db = context.env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    let userId: string | null = null;

    if (type === "rider") {
      userId = await getRiderSession();
    } else if (type === "store") {
      const storeId = await getStoreSession();
      if (storeId) {
        const store = await db.prepare("SELECT ownerId FROM stores WHERE id = ?").bind(storeId).first() as any;
        userId = store?.ownerId || null;
      }
    }

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (action === "setup") {
      if (!pin || pin.length !== 6) return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
      const hashedPin = await hashPin(pin);
      await db.prepare("UPDATE users SET walletPin = ? WHERE id = ?").bind(hashedPin, userId).run();
      return NextResponse.json({ success: true });
    } 
    
    if (action === "verify") {
      const user = await db.prepare("SELECT walletPin FROM users WHERE id = ?").bind(userId).first() as any;
      if (!user?.walletPin) return NextResponse.json({ error: "PIN not set" }, { status: 400 });
      
      const hashedPin = await hashPin(pin);
      if (user.walletPin === hashedPin) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: "Incorrect PIN" }, { status: 401 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("PIN operation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
