import { D1Database } from "@cloudflare/workers-types";
import { OrderStatus } from "@/types";
import { 
  sendLinePush, 
  rubberAcceptedFlex, 
  deliveringToStoreFlex,
  washingOrderFlex, 
  readyForDeliveryFlex, 
  deliveringToCustomerFlex,
  orderCompletedFlex 
} from "./line";
import { createNotification } from "./notify-server";

/**
 * Handle Order Status Transitions and Notifications
 */
export async function transitionOrderStatus(
  db: D1Database,
  orderId: string,
  nextStatus: OrderStatus,
  env: any,
  options?: {
    rubberName?: string;
    evidenceUrl?: string; // For Before/After evidence
  }
) {
  // 1. Fetch Order & User Info (Include service GP)
  const order = await db.prepare(`
    SELECT o.*, u.displayName as customerName, u.id as customerLineId
    FROM orders o
    JOIN users u ON o.userId = u.id
    WHERE o.id = ?
  `).bind(orderId).first() as any;

  if (!order) throw new Error(`Order ${orderId} not found`);

  // 2. Validate Transition
  const currentStatus = order.status as OrderStatus;
  if (currentStatus === "completed" || currentStatus === "cancelled") {
    console.warn(`Attempted to transition a closed order (${orderId}) from ${currentStatus} to ${nextStatus}`);
    return { success: false, message: "Order is already closed" };
  }

  // 3. Update Database (Including evidence and timestamps)
  // 🤖 AUTO-CHAIN: When rubber drops off at store → auto-transition to "washing"
  // Admin is not at the store, so once the driver confirms delivery with a photo,
  // the system immediately marks it as washing.
  let actualStatus = nextStatus;
  if (nextStatus === "at_shop") {
    actualStatus = "washing" as OrderStatus;
  }

  let query = "UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP";
  const params: any[] = [actualStatus];

  if (options?.evidenceUrl) {
    if (nextStatus === "delivering_to_store") {
      query += ", pickupPhotoUrl = ?, evidenceBeforeUrl = ?";
      params.push(options.evidenceUrl, options.evidenceUrl);
    } else if (nextStatus === "at_shop") {
      // Still save the dropoff photo and timestamp even though we auto-chain to washing
      query += ", dropoffShopPhotoUrl = ?, arrivedAtShopAt = CURRENT_TIMESTAMP";
      params.push(options.evidenceUrl);
    } else if (nextStatus === "completed") {
      query += ", evidenceAfterUrl = ?";
      params.push(options.evidenceUrl);
    }
  } else if (nextStatus === "at_shop") {
    query += ", arrivedAtShopAt = CURRENT_TIMESTAMP";
  }

  // Auto-mark payment as paid when order is completed
  if (actualStatus === "completed") {
    query += ", paymentStatus = CASE WHEN paymentStatus = 'pending' THEN 'paid' ELSE paymentStatus END";
  }

  query += " WHERE id = ?";
  params.push(orderId);

  await db.prepare(query).bind(...params).run();

  // 4. Trigger Notifications
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
  if (accessToken) {
    let flexMessage: any = null;

    // Default status text descriptions
    const statusDescMap: Record<string, string> = {
      accepted: "ผู้ให้บริการรับงานของคุณแล้ว!",
      in_progress: "กำลังเดินทางไปให้บริการครับ",
      completed: "งานสำเร็จเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ!"
    };

    // Helper to notify rubber earning
    const notifyRubberEarning = async (driverId: string, role: string) => {
      try {
        let rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
        if (!rubberToken) {
          const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_token_rubber'").first() as any;
          if (setting?.value) rubberToken = setting.value;
        }
        
        const deliveryFee = order.deliveryFee || 0;
        const totalRubberPayout = deliveryFee - (deliveryFee * 0.10) - 10;
        const splitEarning = totalRubberPayout * 0.5; // 50% for pickup, 50% for delivery

        if (!driverId) return;
        const rInfo = await db.prepare("SELECT id, lineUserId FROM rubber_users WHERE id = ?").bind(driverId).first() as any;
        if (!rInfo) return;
        
        // 1. In-App Notification
        await createNotification(db, {
          userId: rInfo.id,
          userType: "rubber",
          type: "earning",
          title: "💰 รายได้เข้าแล้ว",
          message: `งาน #${orderId.slice(-6)} (${role}) เสร็จสิ้น — ได้รับ ฿${splitEarning.toFixed(0)}`,
          link: "/rubber/wallet"
        }).catch(() => {});

        // 2. LINE Push Notification (Flex Message — matches "มีงานใหม่เข้า" style)
        if (rubberToken && rInfo.lineUserId) {
          try {
            const { rubberEarningFlex } = await import("./line");
            const res = await sendLinePush(
              rInfo.lineUserId,
              [rubberEarningFlex(orderId, role, splitEarning)],
              rubberToken
            );
            console.log(`  ✅ [EARN] LINE push → ${rInfo.lineUserId}`, JSON.stringify(res));
            db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`EARN-${orderId}-${driverId}-${Date.now()}`, 'earn_success', JSON.stringify(res), null).run().catch(() => {});
          } catch (e: any) {
            console.error(`Failed to notify earning to rubber ${rInfo.lineUserId}:`, e);
            db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`EARN-${orderId}-${driverId}-${Date.now()}`, 'earn_fail', rInfo.lineUserId || '', e?.message || String(e)).run().catch(() => {});
          }
        }
      } catch (e) {
        console.error("Notify earning error:", e);
      }
    };

    switch (actualStatus) {
      case "picking_up":
        if (options?.rubberName) {
          flexMessage = rubberAcceptedFlex(orderId, options.rubberName);
        }
        break;
      case "delivering_to_store":
        flexMessage = deliveringToStoreFlex(orderId);
        break;
      case "washing":
        // Notify customer their clothes are now being washed
        // This fires both when admin manually triggers AND when auto-chained from at_shop
        flexMessage = washingOrderFlex(orderId);
        
        // 💰 Earnings Notification for Pickup Driver (Leg 1)
        if (order.pickupDriverId) {
          await notifyRubberEarning(order.pickupDriverId, "รับผ้า");
          // 📒 Record wallet ledger entry
          try {
            const deliveryFee = order.deliveryFee || 0;
            const totalPayout = deliveryFee - (deliveryFee * 0.10) - 10;
            const legEarn = totalPayout * 0.5;
            const { nanoid } = await import("nanoid");
            await db.prepare(`INSERT INTO wallet_transactions (id, userId, userType, type, amount, referenceId, description) VALUES (?, ?, 'rubber', 'credit', ?, ?, ?)`)
              .bind(`WTX-${nanoid(8)}`, order.pickupDriverId, legEarn, orderId, `Pickup Leg #${orderId.slice(-6)}`).run();
          } catch (e) { console.error("Wallet ledger (pickup) error:", e); }
        }
        break;
      case "ready_for_pickup":
        flexMessage = readyForDeliveryFlex(orderId);
        
        // 🤖 Automation: Broadcast to Geo-Matching Rubbers via Push Message
        try {
          const { broadcastToEligibleRubbers } = await import("./dispatch");
          await broadcastToEligibleRubbers(
            db, env, orderId,
            order.address,
            order.deliveryFee || 0,
            nextStatus
          );
        } catch (e) {
          console.error("Failed to broadcast ready_for_pickup to rubbers:", e);
        }
        break;
      case "delivering_to_customer":
        flexMessage = deliveringToCustomerFlex(orderId);
        break;
      case "completed":
        flexMessage = orderCompletedFlex(orderId);
        
        // 💰 Earnings Notification for Delivery Driver (Leg 2)
        if (order.deliveryDriverId) {
          await notifyRubberEarning(order.deliveryDriverId, "ส่งผ้าคืน");
          // 📒 Record wallet ledger entry
          try {
            const deliveryFee = order.deliveryFee || 0;
            const totalPayout = deliveryFee - (deliveryFee * 0.10) - 10;
            const legEarn = totalPayout * 0.5;
            const { nanoid } = await import("nanoid");
            await db.prepare(`INSERT INTO wallet_transactions (id, userId, userType, type, amount, referenceId, description) VALUES (?, ?, 'rubber', 'credit', ?, ?, ?)`)
              .bind(`WTX-${nanoid(8)}`, order.deliveryDriverId, legEarn, orderId, `Delivery Leg #${orderId.slice(-6)}`).run();
          } catch (e) { console.error("Wallet ledger (delivery) error:", e); }
        }
        break;
      default:
        // Generic Flex for Direct Service or other statuses
        const { orderStatusUpdateFlex } = await import("./line");
        if (statusDescMap[nextStatus]) {
          flexMessage = orderStatusUpdateFlex(orderId, tStatus(nextStatus), statusDescMap[nextStatus], "#3b82f6");
        }
    }

    if (flexMessage) {
      await sendLinePush(order.customerLineId, [flexMessage], accessToken)
        .catch(err => console.error("Failed to send status update notification:", err));
    }
  }

  return { success: true, nextStatus: actualStatus };
}

function tStatus(status: string) {
  const map: Record<string, string> = {
    accepted: "รับงานแล้ว",
    in_progress: "กำลังดำเนินการ",
    at_shop: "ถึงร้านแล้ว",
    washing: "กำลังซัก",
    ready_for_pickup: "ซักเสร็จพร้อมส่ง",
    completed: "สำเร็จ"
  };
  return map[status] || status;
}
