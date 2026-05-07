import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession, getStoreSession } from "@/lib/auth-server";

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
 * Self-healing: ensure walletPin column exists on the target table.
 * Called before any PIN read/write operation.
 */
async function ensureWalletPinColumn(db: any, tableName: string) {
  try {
    await db.prepare(`ALTER TABLE ${tableName} ADD COLUMN walletPin TEXT`).run();
  } catch (e) {
    // Column already exists — ignore
  }
}

/**
 * Resolve the userId and tableName for PIN operations
 */
async function resolveUser(type: string, db: any, bodyUserId?: string): Promise<{ userId: string | null; tableName: string }> {
  let userId: string | null = null;

  if (type === "rubber") {
    userId = await getRubberSession();
    return { userId, tableName: "rubber_users" };
  } else if (type === "store") {
    userId = await getStoreSession();
    return { userId, tableName: "stores" };
  } else if (type === "customer") {
    userId = bodyUserId || null;
    return { userId, tableName: "users" };
  }

  return { userId: null, tableName: "users" };
}

/**
 * GET /api/user/pin?type=...
 * Check if the user has a PIN set
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "customer";
    
    const context = getRequestContext();
    const db = context.env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    const { tableName } = await resolveUser(type, db);

    let userId: string | null = null;

    if (type === "rubber") {
      userId = await getRubberSession();
    } else if (type === "store") {
      userId = await getStoreSession();
    } else if (type === "customer") {
      userId = searchParams.get("userId");
    }

    if (!userId) {
      console.warn(`[PIN] Unauthorized access attempt for type: ${type}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Self-healing: ensure column exists before reading
    await ensureWalletPinColumn(db, tableName);

    const user = await db.prepare(`SELECT walletPin FROM ${tableName} WHERE id = ?`).bind(userId).first() as any;
    
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
    const { action, pin, type, userId: bodyUserId } = await req.json() as any;
    
    const context = getRequestContext();
    const db = context.env.DB;
    if (!db) return NextResponse.json({ error: "DB not found" }, { status: 500 });

    const { userId, tableName } = await resolveUser(type, db, bodyUserId);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Self-healing: ensure column exists before any operation
    await ensureWalletPinColumn(db, tableName);

    if (action === "setup") {
      if (!pin || pin.length !== 6) return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
      
      const hashedPin = await hashPin(pin);
      const result = await db.prepare(`UPDATE ${tableName} SET walletPin = ? WHERE id = ?`).bind(hashedPin, userId).run();
      
      // Verify the update actually affected a row
      if (result?.meta?.changes === 0) {
        console.error(`[PIN] No rows updated for ${type} userId=${userId} in table=${tableName}`);
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } 
    
    if (action === "verify") {
      const user = await db.prepare(`SELECT walletPin FROM ${tableName} WHERE id = ?`).bind(userId).first() as any;
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
