import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getRequestContext().env.DB;
    
    // Check if duvet_washing exists
    const exists = await db.prepare("SELECT id FROM services WHERE id = 'duvet_washing'").first();
    
    if (!exists) {
      await db.prepare(`
        INSERT INTO services (id, name, category, description, basePrice, unit, icon, estimatedDays, isActive, gpPercent)
        VALUES ('duvet_washing', 'ซักผ้านวม', 'laundry', 'บริการซักผ้านวมโดยเฉพาะ รองรับสูงสุด 28kg', 199, 'piece', 'duvet_washing', 2, 1, 15)
      `).run();
      return NextResponse.json({ success: true, message: "Inserted duvet_washing" });
    }
    
    return NextResponse.json({ success: true, message: "Already exists" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
