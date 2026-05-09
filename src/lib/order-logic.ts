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
        
        // 🤖 Automation: Also broadcast to Rubbers via Push Message
        try {
          const deliveryFee = order.deliveryFee || 0;
          let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
          let rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;

          if (!customerToken) {
            const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'").first() as any;
            if (setting?.value) customerToken = setting.value;
          }
          if (!rubberToken) {
            const setting = await db.prepare("SELECT value FROM system_settings WHERE key = 'line_channel_access_token_rubber'").first() as any;
            if (setting?.value) rubberToken = setting.value;
          }
          
          rubberToken = rubberToken || customerToken;

          if (rubberToken) {
            const { sendLinePush, rubberNewJobFlex } = await import("./line");
            
            const rubbers = await db.prepare(`
              SELECT lineUserId, preferences
              FROM rubber_users
              WHERE lineUserId IS NOT NULL
            `).all();

            // 15% commission + 15 THB Platform Fee
            const totalOrderEarn = deliveryFee - (deliveryFee * 0.15) - 15;
            const legEarn = totalOrderEarn * 0.5;

            for (const r of (rubbers.results as any[])) {
              try {
                const prefs = JSON.parse(r.preferences || "{}");
                if (prefs.workStatus === true) {
                  // Re-use rubberNewJobFlex but maybe pass 'ready_for_return' status
                  await sendLinePush(r.lineUserId, [rubberNewJobFlex(orderId, nextStatus, legEarn)], rubberToken).catch(() => {});
                }
              } catch (e) {}
            }
          }
        } catch (e) {
          console.error("Failed to broadcast ready_for_return to rubbers:", e);
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
