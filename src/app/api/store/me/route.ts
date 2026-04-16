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

    const store = await db.prepare(`
      SELECT id, name, email FROM stores WHERE id = ? AND isActive = 1
    `).bind(storeId).first() as any;

    if (store) {
      return NextResponse.json({ 
        success: true, 
        store: {
          id: store.id,
          name: store.name,
          email: store.email
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
