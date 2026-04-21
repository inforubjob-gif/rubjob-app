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
  }
) {
  // 1. Fetch Order & User Info
  const order = await db.prepare(`
    SELECT o.*, u.displayName as customerName, u.id as customerLineId
    FROM orders o
    JOIN users u ON o.userId = u.id
    WHERE o.id = ?
  `).bind(orderId).first() as any;

  if (!order) throw new Error(`Order ${orderId} not found`);

  // 2. Validate Transition (Optional - Can add more complex logic here)
  const currentStatus = order.status as OrderStatus;
  if (currentStatus === "completed" || currentStatus === "cancelled") {
    console.warn(`Attempted to transition a closed order (${orderId}) from ${currentStatus} to ${nextStatus}`);
    return { success: false, message: "Order is already closed" };
  }

  // 3. Update Database
  await db.prepare(`
    UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(nextStatus, orderId).run();

  // 4. Trigger Notifications
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN;
  if (accessToken) {
    let flexMessage: any = null;

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
        
        // 🤖 Automation: Also broadcast to ALL Online Riders for the delivery leg
        const riders = await db.prepare(`
          SELECT ru.lineUserId, u.preferences
          FROM rider_users ru
          JOIN users u ON ru.id = u.id
          WHERE ru.lineUserId IS NOT NULL
        `).all();

        // Calculate Earnings (Leg 2)
        const settingsRows = await db.prepare(`
          SELECT key, value FROM system_settings WHERE key IN ('gp_rider_percent', 'rider_base_payout')
        `).all();
        const settings: any = {};
        settingsRows.results.forEach((r: any) => settings[r.key] = r.value);
        
        const gpRiderPercent = parseFloat(settings.gp_rider_percent || "10");
        const riderBasePayout = parseFloat(settings.rider_base_payout || "0");
        const deliveryFee = order.deliveryFee || 0;
        const commission = (deliveryFee * gpRiderPercent) / 100;
        const legEarn = ((deliveryFee - commission) + riderBasePayout) * 0.5;

        const { riderNewJobFlex } = await import("./line");
        for (const r of (riders.results as any[])) {
          try {
            const prefs = JSON.parse(r.preferences || "{}");
            if (prefs.workStatus === true) {
              await sendLinePush(r.lineUserId, [riderNewJobFlex(orderId, 'ready_for_pickup', legEarn)], accessToken).catch(() => {});
            }
          } catch (e) {}
        }
        break;
      case "delivering_to_customer":
        flexMessage = deliveringToCustomerFlex(orderId);
        break;
      case "completed":
        flexMessage = orderCompletedFlex(orderId);
        break;
      // Add other statuses as needed
    }

    if (flexMessage) {
      await sendLinePush(order.customerLineId, [flexMessage], accessToken)
        .catch(err => console.error("Failed to send status update notification:", err));
    }
  }

  return { success: true, nextStatus };
}
