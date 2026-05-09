/**
 * Support Chat → LINE Admin Notification Bridge
 * 
 * When a user sends an in-app support message, this forwards a notification
 * to the admin LINE group/account so admins can see it in real-time.
 * 
 * Uses LINE Messaging API push to a Group ID (LINE_ADMIN_GROUP_ID).
 * Falls back to LINE_CHANNEL_ACCESS_TOKEN if no dedicated support token exists.
 */

interface NotifyParams {
  userName: string;
  userType: 'rubber' | 'store' | 'customer';
  ticketId: string;
  message: string;
  isNewTicket: boolean;
}

/**
 * Send a notification to the admin LINE group about new in-app support messages.
 */
export async function notifyAdminLine(
  params: NotifyParams,
  env: any
): Promise<boolean> {
  const groupId = env.LINE_ADMIN_GROUP_ID;
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN_HELP || env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!groupId || !accessToken) {
    console.warn("[support-notify] LINE_ADMIN_GROUP_ID or access token not set. Skipping LINE notification.");
    return false;
  }

  const userTypeLabel = params.userType === 'rubber' ? '🏍️ รับเบอร์' 
    : params.userType === 'store' ? '🏪 ร้านค้า' 
    : '👤 ลูกค้า';

  const headerText = params.isNewTicket 
    ? '🆕 ข้อความใหม่จากแอป!' 
    : '💬 ข้อความเข้าจากแอป';

  // Truncate long messages for LINE
  const truncated = params.message.length > 200 
    ? params.message.substring(0, 200) + '...' 
    : params.message;

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [
          {
            type: "flex",
            altText: `${headerText} - ${params.userName}`,
            contents: {
              type: "bubble",
              size: "kilo",
              body: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                contents: [
                  {
                    type: "text",
                    text: headerText,
                    weight: "bold",
                    size: "md",
                    color: params.isNewTicket ? "#ef4444" : "#f59e0b",
                  },
                  {
                    type: "separator",
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    spacing: "sm",
                    margin: "md",
                    contents: [
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          {
                            type: "text",
                            text: "ผู้ส่ง",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: params.userName || "ไม่ระบุชื่อ",
                            color: "#333333",
                            size: "sm",
                            flex: 5,
                            weight: "bold",
                          },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          {
                            type: "text",
                            text: "ประเภท",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: userTypeLabel,
                            color: "#333333",
                            size: "sm",
                            flex: 5,
                          },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          {
                            type: "text",
                            text: "Ticket",
                            color: "#aaaaaa",
                            size: "sm",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: params.ticketId,
                            color: "#666666",
                            size: "xs",
                            flex: 5,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "md",
                    backgroundColor: "#f8fafc",
                    cornerRadius: "md",
                    paddingAll: "md",
                    contents: [
                      {
                        type: "text",
                        text: truncated,
                        wrap: true,
                        size: "sm",
                        color: "#333333",
                      },
                    ],
                  },
                ],
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    color: "#FF9F1C",
                    height: "sm",
                    action: {
                      type: "uri",
                      label: "เปิดแชทใน Admin",
                      uri: "https://admin.rubjob-all.com/support",
                    },
                  },
                ],
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[support-notify] LINE push failed:", errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[support-notify] Error sending LINE notification:", error);
    return false;
  }
}

export async function notifyAdminNewOrder(
  params: { orderId: string; customerName: string; serviceName: string; totalPrice: number },
  env: any
): Promise<boolean> {
  const groupId = env.LINE_ADMIN_GROUP_ID;
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN_HELP || env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!groupId || !accessToken) return false;

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{
          type: "text",
          text: `🚨 ออเดอร์ใหม่เข้า!\nรหัส: ${params.orderId}\nลูกค้า: ${params.customerName}\nบริการ: ${params.serviceName}\nราคา: ฿${params.totalPrice}\n\nตรวจสอบ: https://admin.rubjob-all.com`
        }]
      })
    });
    return true;
  } catch (e) {
    console.error("Notify admin new order error:", e);
    return false;
  }
}

export async function notifyAdminDelayedOrder(
  params: { orderId: string; storeName: string; hours: number },
  env: any
): Promise<boolean> {
  const groupId = env.LINE_ADMIN_GROUP_ID;
  const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN_HELP || env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!groupId || !accessToken) return false;

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{
          type: "text",
          text: `⚠️ ออเดอร์ค้างที่ร้าน!\nรหัส: ${params.orderId}\nร้าน: ${params.storeName}\nเวลา: ${params.hours} ชั่วโมงแล้ว\n\nตรวจสอบ: https://admin.rubjob-all.com`
        }]
      })
    });
    return true;
  } catch (e) {
    console.error("Notify admin delayed order error:", e);
    return false;
  }
}
