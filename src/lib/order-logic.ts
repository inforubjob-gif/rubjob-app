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
  let query = "UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP";
  const params: any[] = [nextStatus];

  if (options?.evidenceUrl) {
    if (nextStatus === "picking_up") {
      query += ", pickupPhotoUrl = ?, evidenceBeforeUrl = ?";
      params.push(options.evidenceUrl, options.evidenceUrl);
    } else if (nextStatus === "at_shop") {
      query += ", dropoffShopPhotoUrl = ?, arrivedAtShopAt = CURRENT_TIMESTAMP";
      params.push(options.evidenceUrl);
    } else if (nextStatus === "completed") {
      query += ", evidenceAfterUrl = ?";
      params.push(options.evidenceUrl);
    }
  } else if (nextStatus === "at_shop") {
    // Even if no photo, record the timestamp
    query += ", arrivedAtShopAt = CURRENT_TIMESTAMP";
  }

  // Auto-mark payment as paid when order is completed
  if (nextStatus === "completed") {
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

    switch (nextStatus) {
      case "picking_up":
        if (options?.rubberName) {
          flexMessage = rubberAcceptedFlex(orderId, options.rubberName);
        }
        break;
      case "at_shop":
      case "delivering_to_store":
        flexMessage = deliveringToStoreFlex(orderId);
        break;
      case "ready_for_return":
      case "ready_for_pickup":
        flexMessage = readyForDeliveryFlex(orderId);
        
        // 🤖 Automation: Also broadcast to Rubbers Group
        const notifyToken = env.LINE_NOTIFY_RUBBER_TOKEN;
        if (notifyToken) {
          const distanceKm = order.distance_km || 0;
          const singleTripFare = 50 + (distanceKm > 3 ? (distanceKm - 3) * 10 : 0);
          const grossRubberFare = singleTripFare * 2;
          const netRubberEarning = grossRubberFare - (grossRubberFare * 0.15) - 15;
          const legEarn = netRubberEarning / 2;

          const { sendLineNotify } = await import("./line");
          const notifyMsg = `\n🧺 ผ้าซักเสร็จแล้ว! [${orderId}]\nรอรับเบอร์ไปส่งคืนลูกค้า\nรายได้: ฿${legEarn.toFixed(2)}\nคลิกรับงาน: https://liff.line.me/${env.NEXT_PUBLIC_LIFF_ID}/rubber`;
          await sendLineNotify(notifyMsg, notifyToken).catch(() => {});
        }
        break;
      case "delivering_to_customer":
        flexMessage = deliveringToCustomerFlex(orderId);
        break;
      case "completed":
        flexMessage = orderCompletedFlex(orderId);
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

  return { success: true, nextStatus };
}

function tStatus(status: string) {
  const map: Record<string, string> = {
    accepted: "รับงานแล้ว",
    in_progress: "กำลังดำเนินการ",
    at_shop: "ถึงร้านแล้ว",
    ready_for_return: "ซักเสร็จพร้อมส่ง",
    completed: "สำเร็จ"
  };
  return map[status] || status;
}
