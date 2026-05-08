import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const storeId = cookieStore.get("store_token")?.value;

    if (!storeId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const context = getRequestContext();
    const db = context?.env?.DB;
    
    if (!db) {
      return NextResponse.json({ error: "Database not found" }, { status: 500 });
    }

    // Self-healing: ensure lineUserId column exists
    try { await db.prepare("ALTER TABLE stores ADD COLUMN lineUserId TEXT").run(); } catch(e) {}

    const store = await db.prepare(`
      SELECT s.id, s.name, s.email, s.lineUserId, u.displayName as lineDisplayName 
      FROM stores s
      LEFT JOIN users u ON s.lineUserId = u.id
      WHERE s.id = ? AND s.isActive = 1
    `).bind(storeId).first() as any;

    if (store) {
      return NextResponse.json({ 
        success: true, 
        store: {
          id: store.id,
          name: store.name,
          email: store.email,
          lineUserId: store.lineUserId,
          lineDisplayName: store.lineDisplayName
        }
      });
    } else {
      return NextResponse.json({ success: false, error: "Store not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Store me error:", err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
