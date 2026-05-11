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
        // Create earning notification for the rubber driver
        if (order.rubberId) {
          try {
            const earning = (order.totalPrice || 0) * 0.85;
            await createNotification(db, {
              userId: order.rubberId,
              userType: "rubber",
              type: "earning",
              title: "💰 รายได้เข้าแล้ว",
              message: `งาน #${orderId.slice(-6)} เสร็จสิ้น — ได้รับ ฿${earning.toFixed(0)}`,
              link: "/rubber/wallet"
            });
          } catch (e) { console.error("Notify earning error:", e); }
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

  // 5. Notify Rubber
  const rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
  if (rubberToken) {
    const rubberId = (actualStatus === "ready_for_pickup" || actualStatus === "delivering_to_customer" || actualStatus === "completed") 
      ? order.deliveryDriverId 
      : order.pickupDriverId;
    
    if (rubberId) {
      const msgs = {
        picking_up: "คุณได้รับงานเรียบร้อย กรุณาไปรับผ้าที่ลูกค้า",
        delivering_to_store: "คุณรับผ้าเรียบร้อยแล้ว กำลังนำส่งไปที่ร้านซัก",
        at_shop: "คุณได้ส่งผ้าถึงร้านซักเรียบร้อยแล้ว (กำลังซัก)",
        ready_for_pickup: "ผ้าซักเสร็จแล้ว กรุณาไปรับที่ร้านซักเพื่อนำส่งลูกค้า",
        delivering_to_customer: "รับผ้าจากร้านซักแล้ว กำลังนำส่งคืนลูกค้า",
        completed: "ลูกค้ารับผ้าเรียบร้อย งานเสร็จสมบูรณ์ ขอบคุณครับ!"
      } as Record<string, string>;

      const msgTxt = msgs[actualStatus] || `สถานะงานอัปเดตเป็น: ${actualStatus}`;
      await sendLinePush(rubberId, [{ type: "text", text: `🚚 อัปเดตงาน: ${orderId}\n\n${msgTxt}` }], rubberToken)
        .catch(e => console.error("Failed to notify rubber:", e));
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
