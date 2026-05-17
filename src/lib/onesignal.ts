/**
 * OneSignal Push Notification Helper
 * Server-side only — sends push notifications via OneSignal REST API
 * 
 * Environment variables needed:
 * - ONESIGNAL_APP_ID
 * - ONESIGNAL_REST_API_KEY
 */

const ONESIGNAL_API = "https://api.onesignal.com/notifications";

interface PushPayload {
  title: string;
  message: string;
  url?: string;
  /** Send to specific user IDs (external_id in OneSignal) */
  userIds?: string[];
  /** Send to all subscribers */
  sendToAll?: boolean;
  /** Additional data payload */
  data?: Record<string, string>;
}

/**
 * Send push notification via OneSignal
 */
export async function sendPushNotification(
  payload: PushPayload,
  appId: string,
  apiKey: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const body: any = {
      app_id: appId,
      headings: { en: payload.title, th: payload.title },
      contents: { en: payload.message, th: payload.message },
    };

    // Target
    if (payload.sendToAll) {
      body.included_segments = ["Subscribed Users"];
    } else if (payload.userIds && payload.userIds.length > 0) {
      body.include_aliases = { external_id: payload.userIds };
      body.target_channel = "push";
    } else {
      return { success: false, error: "No target specified" };
    }

    // Optional URL when clicked
    if (payload.url) {
      body.url = payload.url;
    }

    // Additional data
    if (payload.data) {
      body.data = payload.data;
    }

    const res = await fetch(ONESIGNAL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (res.ok) {
      return { success: true, id: result.id };
    } else {
      console.error("OneSignal error:", result);
      return { success: false, error: result.errors?.[0] || "Unknown error" };
    }
  } catch (err) {
    console.error("OneSignal send failed:", err);
    return { success: false, error: "Network error" };
  }
}

// ===== Pre-built notification templates =====

export function notifyNewOrder(orderId: string, userIds: string[], appId: string, apiKey: string) {
  return sendPushNotification({
    title: "📦 มีงานใหม่!",
    message: "มีออเดอร์ใหม่รอรับ กดดูรายละเอียด",
    url: `/rubber/orders/${orderId}`,
    userIds,
    data: { type: "new_order", orderId },
  }, appId, apiKey);
}

export function notifyOrderStatusChange(
  orderId: string,
  status: string,
  userIds: string[],
  appId: string,
  apiKey: string
) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    accepted: { title: "✅ งานถูกรับแล้ว", message: "Rubber กำลังมารับผ้าของคุณ" },
    picked_up: { title: "🚗 รับผ้าแล้ว", message: "ผ้าของคุณถูกรับไปส่งร้านซักแล้ว" },
    washing: { title: "🧺 กำลังซัก", message: "ผ้าของคุณกำลังถูกซักอยู่" },
    ready_for_pickup: { title: "✨ ซักเสร็จแล้ว!", message: "ผ้าของคุณพร้อมส่งกลับ" },
    delivering: { title: "🚗 กำลังส่งกลับ", message: "Rubber กำลังนำผ้ากลับมาส่ง" },
    completed: { title: "🎉 เสร็จสมบูรณ์!", message: "ออเดอร์เสร็จเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ" },
  };

  const msg = statusMessages[status] || { title: "📦 อัพเดทออเดอร์", message: `สถานะ: ${status}` };

  return sendPushNotification({
    title: msg.title,
    message: msg.message,
    url: `/orders/${orderId}`,
    userIds,
    data: { type: "order_status", orderId, status },
  }, appId, apiKey);
}

export function notifyPayoutApproved(amount: number, userIds: string[], appId: string, apiKey: string) {
  return sendPushNotification({
    title: "💰 เงินเข้าแล้ว!",
    message: `ยอดถอน ฿${amount.toLocaleString()} ได้รับการอนุมัติแล้ว`,
    url: "/rubber/wallet",
    userIds,
    data: { type: "payout_approved" },
  }, appId, apiKey);
}
