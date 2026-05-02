import { D1Database } from "@cloudflare/workers-types";
import { OrderStatus } from "@/types";
import { 
  sendLinePush, 
  riderAcceptedFlex, 
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
    riderName?: string;
    evidenceUrl?: string; // For Before/After evidence
  }
) {
  // 1. Fetch Order & User Info (Include service GP)
  const order = await db.prepare(`
    SELECT o.*, u.displayName as customerName, u.id as customerLineId, s.gpPercent as serviceGp
    FROM orders o
    JOIN users u ON o.userId = u.id
    JOIN services s ON o.serviceId = s.id
    WHERE o.id = ?
  `).bind(orderId).first() as any;

  if (!order) throw new Error(`Order ${orderId} not found`);

  // 2. Validate Transition
  const currentStatus = order.status as OrderStatus;
  if (currentStatus === "completed" || currentStatus === "cancelled") {
    console.warn(`Attempted to transition a closed order (${orderId}) from ${currentStatus} to ${nextStatus}`);
    return { success: false, message: "Order is already closed" };
  }

  // 3. Update Database (Including evidence if applicable)
  let query = "UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP";
  const params: any[] = [nextStatus];

  if (options?.evidenceUrl) {
    if (nextStatus === "picking_up" || nextStatus === "accepted") {
      query += ", evidenceBeforeUrl = ?";
      params.push(options.evidenceUrl);
    } else if (nextStatus === "completed") {
      query += ", evidenceAfterUrl = ?";
      params.push(options.evidenceUrl);
    }
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
        if (options?.riderName) {
          flexMessage = riderAcceptedFlex(orderId, options.riderName);
        }
        break;
      case "delivering_to_store":
        flexMessage = deliveringToStoreFlex(orderId);
        break;
      case "washing":
        flexMessage = washingOrderFlex(orderId);
        break;
      case "ready_for_pickup":
        flexMessage = readyForDeliveryFlex(orderId);
        
        // 🤖 Automation: Also broadcast to Riders Group (Category-based GP logic)
        const notifyToken = env.LINE_NOTIFY_RIDER_TOKEN;
        if (notifyToken) {
          const settingsRows = await db.prepare(`
            SELECT key, value FROM system_settings WHERE key IN ('gp_rider_percent', 'rider_base_payout')
          `).all();
          const settings: any = {};
          settingsRows.results.forEach((r: any) => settings[r.key] = r.value);
          
          // Use service specific GP if available, else platform default
          const gpRiderPercent = order.serviceGp || parseFloat(settings.gp_rider_percent || "10");
          const riderBasePayout = parseFloat(settings.rider_base_payout || "0");
          
          const deliveryFee = order.deliveryFee || 0;
          const commission = (deliveryFee * gpRiderPercent) / 100;
          const legEarn = ((deliveryFee - commission) + riderBasePayout) * 0.5;

          const { sendLineNotify } = await import("./line");
          const notifyMsg = `\n🧺 ผ้าซักเสร็จแล้ว! [${orderId}]\nรอไรเดอร์ไปส่งคืนลูกค้า\nรายได้: ฿${legEarn}\nคลิกรับงาน: https://liff.line.me/${env.NEXT_PUBLIC_LIFF_ID}/rider`;
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
    completed: "สำเร็จ"
  };
  return map[status] || status;
}
