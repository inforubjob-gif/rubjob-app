import { safeError } from "@/lib/api-utils";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-server";
import { ensureSchema } from "@/lib/db-init";
import { getGPConfig } from "@/lib/gp-config";

export const runtime = "edge";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    const { results: rubbers } = await db.prepare(`
      SELECT r.*, u.displayName as lineDisplayName 
      FROM rubber_users r
      LEFT JOIN users u ON r.lineUserId = u.id
      ORDER BY r.createdAt DESC
    `).all();

    // Fetch documents for all rubbers
    const { results: docs } = await db.prepare(`
      SELECT * FROM rubber_documents
    `).all();

    const gp = await getGPConfig(db);
    const gpRubberFraction = gp.gpRubberPercent / 100;

    // Fetch wallet data for all rubbers in batch
    const { results: rubberEarnings } = await db.prepare(`
      SELECT pickupDriverId as id, SUM(deliveryFee - (deliveryFee * ?) - ?) * 0.5 as earned
      FROM orders WHERE status = 'completed' AND pickupDriverId IS NOT NULL
      GROUP BY pickupDriverId
    `).bind(gpRubberFraction, gp.platformFeePerDelivery).all();
    const { results: rubberEarnings2 } = await db.prepare(`
      SELECT deliveryDriverId as id, SUM(deliveryFee - (deliveryFee * ?) - ?) * 0.5 as earned
      FROM orders WHERE status = 'completed' AND deliveryDriverId IS NOT NULL
      GROUP BY deliveryDriverId
    `).bind(gpRubberFraction, gp.platformFeePerDelivery).all();
    const { results: rubberWithdrawals } = await db.prepare(`
      SELECT requesterId as id, SUM(amount) as withdrawn
      FROM payout_requests WHERE requesterType = 'rubber' AND status != 'rejected'
      GROUP BY requesterId
    `).all();

    const earningsMap: Record<string, number> = {};
    (rubberEarnings as any[]).forEach((r: any) => { earningsMap[r.id] = (earningsMap[r.id] || 0) + (r.earned || 0); });
    (rubberEarnings2 as any[]).forEach((r: any) => { earningsMap[r.id] = (earningsMap[r.id] || 0) + (r.earned || 0); });
    const withdrawnMap: Record<string, number> = {};
    (rubberWithdrawals as any[]).forEach((r: any) => { withdrawnMap[r.id] = r.withdrawn || 0; });

    const rubbersWithDocs = rubbers.map((r: any) => {
      let workStatus = false;
      try {
        const prefs = r.preferences ? JSON.parse(r.preferences) : {};
        workStatus = !!prefs.workStatus;
      } catch (e) {}
      const totalEarned = earningsMap[r.id] || 0;
      const totalWithdrawn = withdrawnMap[r.id] || 0;
      return {
        ...r,
        workStatus,
        walletBalance: Math.max(0, totalEarned - totalWithdrawn),
        displayId: r.rubber_number ? `RD-${String(r.rubber_number).padStart(4, '0')}` : r.id,
        documents: docs.filter((d: any) => d.rubberId === r.id)
      };
    });

    return NextResponse.json({ rubbers: rubbersWithDocs });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await req.json() as any;
    const { email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, bankName, accountNumber, accountName } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    // Self-healing: Ensure required columns exist
    await ensureSchema(db);

    if (!email || !password || !name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // 1. Get next rubber number
    const lastRubber = await db.prepare("SELECT rubber_number FROM rubber_users ORDER BY rubber_number DESC LIMIT 1").first() as any;
    const nextNumber = (lastRubber?.rubber_number || 0) + 1;
    const displayId = `RD-${String(nextNumber).padStart(4, '0')}`;
    const id = `RDR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await db.prepare(`
      INSERT INTO rubber_users (id, email, password, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, status, rubber_number, bankName, accountNumber, accountName, pictureUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
    `).bind(
      id, email, password, name, phone || "", vehicleType || "bike", address || "", idNumber || "", licensePlate || "", emergencyContact || "", nextNumber,
      bankName || "", accountNumber || "", accountName || "", payload.pictureUrl || ""
    ).run();

    return NextResponse.json({ success: true, id, displayId });
  } catch (error: unknown) {
    if (((error instanceof Error) ? safeError(error) : "").includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = await req.json() as any;
    const { id, status, name, phone, vehicleType, address, idNumber, licensePlate, emergencyContact, bankName, accountNumber, accountName, documents, password, rejectionReasons, rejectionNote } = payload;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Fetch current rubber data before update (for status change detection)
    const currentRubber = await db.prepare("SELECT status, email, name, rubber_number FROM rubber_users WHERE id = ?").bind(id).first() as any;

    // Update main rubber info
    await db.prepare(`
      UPDATE rubber_users 
      SET status = COALESCE(?, status),
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          vehicleType = COALESCE(?, vehicleType),
          address = COALESCE(?, address),
          idNumber = COALESCE(?, idNumber),
          licensePlate = COALESCE(?, licensePlate),
          emergencyContact = COALESCE(?, emergencyContact),
          bankName = COALESCE(?, bankName),
          accountNumber = COALESCE(?, accountNumber),
          accountName = COALESCE(?, accountName),
          pictureUrl = COALESCE(?, pictureUrl),
          password = COALESCE(?, password)
      WHERE id = ?
    `).bind(
      status || null, name || null, phone || null, vehicleType || null, address || null, idNumber || null, licensePlate || null, emergencyContact || null, 
      bankName || null, accountNumber || null, accountName || null, payload.pictureUrl || null, password || null, id
    ).run();

    // Handle documents if provided
    if (documents && Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.id) {
            await db.prepare(`
               UPDATE rubber_documents SET status = ?, url = ?, notes = ? WHERE id = ?
            `).bind(doc.status, doc.url, doc.notes, doc.id).run();
        } else if (doc.type && doc.url) {
            const docId = `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            await db.prepare(`
               INSERT INTO rubber_documents (id, rubberId, type, status, url, notes)
               VALUES (?, ?, ?, ?, ?, ?)
            `).bind(docId, id, doc.type, doc.status || 'pending', doc.url || "", doc.notes || "").run();
        }
      }

      // Sync profile_photo → rubber_users.pictureUrl
      const profileDoc = documents.find((d: any) => d.type === 'profile_photo');
      if (profileDoc) {
        const picValue = profileDoc.id || profileDoc.url || null;
        if (picValue) {
          await db.prepare(`UPDATE rubber_users SET pictureUrl = ? WHERE id = ?`).bind(picValue, id).run();
        }
      }
    }

    // ─── 📧 Email Notifications on Status Change ─────────────────
    if (currentRubber && status && currentRubber.status !== status) {
      const env = getRequestContext().env;
      const resendKey = env.RESEND_API_KEY;

      if (resendKey && currentRubber.email) {
        try {
          const { sendEmail, buildWelcomeEmail, buildRejectionEmail } = await import("@/lib/email");
          const rubberName = name || currentRubber.name || "Rubber";
          const rubberEmail = currentRubber.email;

          if (status === "active" && currentRubber.status === "pending") {
            // ✅ Approved — send welcome email
            const displayId = currentRubber.rubber_number 
              ? `RD-${String(currentRubber.rubber_number).padStart(4, '0')}` 
              : id;
            const { subject, html } = buildWelcomeEmail({ name: rubberName, email: rubberEmail, displayId });
            await sendEmail({ to: rubberEmail, subject, html, apiKey: resendKey });
            console.log(`[APPROVE] Welcome email sent to ${rubberEmail}`);
          } else if (status === "rejected") {
            // ❌ Rejected — send rejection email with reasons
            const reasons = rejectionReasons || ["ข้อมูลไม่ครบถ้วน"];
            const { subject, html } = buildRejectionEmail({ name: rubberName, reasons, adminNote: rejectionNote });
            await sendEmail({ to: rubberEmail, subject, html, apiKey: resendKey });
            console.log(`[REJECT] Rejection email sent to ${rubberEmail}`);
          }
        } catch (emailErr) {
          // Non-fatal: don't block the status update if email fails
          console.error("[EMAIL] Failed to send notification:", emailErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json() as any;
    const db = getRequestContext().env.DB;
    if (!db) return NextResponse.json({ error: "D1 not found" }, { status: 500 });

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await db.prepare(`DELETE FROM rubber_users WHERE id = ?`).bind(id).run();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: safeError(error) }, { status: 500 });
  }
}
