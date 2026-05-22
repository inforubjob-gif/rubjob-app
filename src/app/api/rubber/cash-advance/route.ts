import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getRubberSession } from "@/lib/auth-server";
import { nanoid } from "nanoid";
import { createNotification } from "@/lib/notify-server";

export const runtime = "edge";

/**
 * GET /api/rubber/cash-advance?rubberId=...
 * Fetch cash advance records + pending total for a rubber
 */
export async function GET(req: Request) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const rubberId = searchParams.get("rubberId");
    if (!rubberId) return NextResponse.json({ error: "Missing rubberId" }, { status: 400 });

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Fetch all records
    const { results: records } = await db.prepare(`
      SELECT * FROM cash_advances WHERE rubberId = ? ORDER BY createdAt DESC LIMIT 50
    `).bind(rubberId).all();

    // Calculate pending total
    const pendingRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as pendingTotal FROM cash_advances WHERE rubberId = ? AND status = 'pending'
    `).bind(rubberId).first() as any;

    // Calculate settled total
    const settledRes = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as settledTotal FROM cash_advances WHERE rubberId = ? AND status = 'settled'
    `).bind(rubberId).first() as any;

    return NextResponse.json({
      records,
      pendingTotal: pendingRes?.pendingTotal || 0,
      settledTotal: settledRes?.settledTotal || 0,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * POST /api/rubber/cash-advance
 * Create a new cash advance record (with cost matrix verification)
 * Body: { rubberId, orderId?, storeId, items: [{ costMatrixId, machineType, machineSizeKg, waterTemp? }] }
 */
export async function POST(req: Request) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { rubberId, orderId, storeId, items, note } = await req.json() as any;
    if (!rubberId || !storeId || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Fetch store name for snapshot
    const store = await db.prepare("SELECT name FROM stores WHERE id = ?").bind(storeId).first() as any;
    const storeName = store?.name || "Unknown Store";

    const createdIds: string[] = [];

    for (const item of items) {
      const { costMatrixId, machineType } = item;
      if (!costMatrixId || !machineType) continue;

      // Verify the cost matrix entry exists and matches
      let verifiedAmount: number | null = null;
      let verifiedSizeKg: number | null = null;
      let verifiedWaterTemp: string | null = null;

      if (machineType === "washer") {
        const row = await db.prepare(
          "SELECT * FROM store_washer_costs WHERE id = ? AND storeId = ?"
        ).bind(costMatrixId, storeId).first() as any;

        if (!row) {
          return NextResponse.json({ error: `Invalid cost matrix ID: ${costMatrixId}` }, { status: 400 });
        }

        const waterTemp = item.waterTemp || "cold";
        verifiedSizeKg = row.sizeKg;
        verifiedWaterTemp = waterTemp;

        if (waterTemp === "cold") verifiedAmount = row.priceCold;
        else if (waterTemp === "warm") verifiedAmount = row.priceWarm;
        else if (waterTemp === "hot") verifiedAmount = row.priceHot;
        else {
          return NextResponse.json({ error: `Invalid water temp: ${waterTemp}` }, { status: 400 });
        }
      } else if (machineType === "dryer") {
        const row = await db.prepare(
          "SELECT * FROM store_dryer_costs WHERE id = ? AND storeId = ?"
        ).bind(costMatrixId, storeId).first() as any;

        if (!row) {
          return NextResponse.json({ error: `Invalid cost matrix ID: ${costMatrixId}` }, { status: 400 });
        }

        verifiedSizeKg = row.sizeKg;
        verifiedAmount = row.price;
      } else {
        return NextResponse.json({ error: `Invalid machineType: ${machineType}` }, { status: 400 });
      }

      if (verifiedAmount === null || verifiedAmount <= 0) {
        return NextResponse.json({ error: "Invalid amount from cost matrix" }, { status: 400 });
      }

      // Create cash advance record
      const id = `CA-${nanoid(8).toUpperCase()}`;
      await db.prepare(`
        INSERT INTO cash_advances (id, rubberId, orderId, storeId, storeName, machineType, machineSizeKg, waterTemp, amount, costMatrixId, note, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).bind(
        id, rubberId, orderId || null, storeId, storeName,
        machineType, verifiedSizeKg, verifiedWaterTemp, verifiedAmount,
        costMatrixId, note || null
      ).run();

      createdIds.push(id);
    }

    // Create notification for rubber
    try {
      const totalAmount = items.length; // Will be summed in the GET endpoint
      await createNotification(db, {
        userId: rubberId,
        userType: "rubber",
        type: "cash_advance",
        title: "💵 บันทึกต้นทุนซักเรียบร้อย",
        message: `บันทึกต้นทุนที่ร้าน ${storeName} เรียบร้อยแล้ว รอ Admin จ่ายคืน`,
        link: "/rubber/wallet/cash-advance"
      });
    } catch (e) { console.error("Cash advance notification error:", e); }

    return NextResponse.json({ success: true, ids: createdIds });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

/**
 * PUT /api/rubber/cash-advance
 * Edit a cash advance record (change machine selection)
 * Body: { id, costMatrixId, machineType, waterTemp?, storeId }
 */
export async function PUT(req: Request) {
  const session = await getRubberSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, costMatrixId, machineType, waterTemp, storeId } = await req.json() as any;
    if (!id || !costMatrixId || !machineType || !storeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Check the record exists and is still pending
    const existing = await db.prepare(
      "SELECT * FROM cash_advances WHERE id = ? AND status = 'pending'"
    ).bind(id).first() as any;
    if (!existing) {
      return NextResponse.json({ error: "Record not found or already settled" }, { status: 404 });
    }

    // Verify new cost matrix entry
    let verifiedAmount: number | null = null;
    let verifiedSizeKg: number | null = null;

    if (machineType === "washer") {
      const row = await db.prepare(
        "SELECT * FROM store_washer_costs WHERE id = ? AND storeId = ?"
      ).bind(costMatrixId, storeId).first() as any;
      if (!row) return NextResponse.json({ error: "Invalid cost matrix" }, { status: 400 });

      verifiedSizeKg = row.sizeKg;
      const temp = waterTemp || "cold";
      if (temp === "cold") verifiedAmount = row.priceCold;
      else if (temp === "warm") verifiedAmount = row.priceWarm;
      else if (temp === "hot") verifiedAmount = row.priceHot;
    } else if (machineType === "dryer") {
      const row = await db.prepare(
        "SELECT * FROM store_dryer_costs WHERE id = ? AND storeId = ?"
      ).bind(costMatrixId, storeId).first() as any;
      if (!row) return NextResponse.json({ error: "Invalid cost matrix" }, { status: 400 });

      verifiedSizeKg = row.sizeKg;
      verifiedAmount = row.price;
    }

    if (verifiedAmount === null || verifiedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Update record
    await db.prepare(`
      UPDATE cash_advances 
      SET machineType = ?, machineSizeKg = ?, waterTemp = ?, amount = ?, costMatrixId = ?
      WHERE id = ?
    `).bind(machineType, verifiedSizeKg, waterTemp || null, verifiedAmount, costMatrixId, id).run();

    return NextResponse.json({ success: true, amount: verifiedAmount });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
