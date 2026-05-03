import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    const store = await db.prepare("SELECT preferences FROM stores WHERE id = ?").bind(storeId).first() as any;

    return NextResponse.json({ 
      success: true, 
      preferences: store?.preferences ? JSON.parse(store.preferences) : {} 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { storeId, ...newPrefs } = await req.json() as any;

    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    
    // Get existing
    const store = await db.prepare("SELECT preferences FROM stores WHERE id = ?").bind(storeId).first() as any;
    const currentPrefs = store?.preferences ? JSON.parse(store.preferences) : {};
    
    // Merge
    const mergedPrefs = { ...currentPrefs, ...newPrefs };

    await db.prepare("UPDATE stores SET preferences = ? WHERE id = ?")
      .bind(JSON.stringify(mergedPrefs), storeId)
      .run();

    return NextResponse.json({ success: true, preferences: mergedPrefs });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
