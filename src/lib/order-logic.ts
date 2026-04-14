import { D1Database } from "@cloudflare/workers-types";
import { OrderStatus } from "@/types";
import { 
  sendLinePush, 
  riderAcceptedFlex, 
  washingOrderFlex, 
  readyForDeliveryFlex, 
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
      case "washing":
        flexMessage = washingOrderFlex(orderId);
        break;
      case "ready_for_delivery":
        flexMessage = readyForDeliveryFlex(orderId);
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
