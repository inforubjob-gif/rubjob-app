/**
 * LINE Messaging API Utility
 * 
 * Used to send push notifications to users.
 * Requires LINE_CHANNEL_ACCESS_TOKEN in environment variables.
 */

import { LineMessage, LineTextMessage, LineFlexMessage, LinePushResponse } from "@/types/line";

export async function sendLinePush(userId: string, messages: LineMessage[], accessToken: string): Promise<LinePushResponse | null> {
  if (!accessToken) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping notification.");
    return null;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`LINE API error: ${JSON.stringify(error)}`);
    }

    return await response.json() as LinePushResponse;
  } catch (error) {
    console.error("Failed to send LINE push notification:", error);
    return null;
  }
}

/**
 * Helper to create a text message
 */
export const textMessage = (text: string): LineTextMessage => ({
  type: "text",
  text,
});

/**
 * Helper to create a Flex Message for Booking Confirmation
 */
export const bookingConfirmationFlex = (orderId: string, serviceName: string, totalPrice: number): LineFlexMessage => ({
  type: "flex",
  altText: "ยืนยันการขอรับบริการ Rubjob",
  contents: {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://app.rubjob-all.com/images/mascot-ready.png",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "fit",
      backgroundColor: "#FFF7ED"
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "รับออเดอร์แล้ว! 📝",
          weight: "bold",
          size: "xl",
          color: "#000000",
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "บริการ",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                },
                {
                  type: "text",
                  text: serviceName,
                  wrap: true,
                  color: "#666666",
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
                  text: "เลขออเดอร์",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                },
                {
                  type: "text",
                  text: orderId,
                  wrap: true,
                  color: "#666666",
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
                  text: "ราคารวม",
                  color: "#aaaaaa",
                  size: "sm",
                  flex: 2,
                },
                {
                  type: "text",
                  text: `฿${totalPrice}`,
                  wrap: true,
                  color: "#eab308",
                  size: "sm",
                  flex: 5,
                  weight: "bold",
                },
              ],
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
          color: "#eab308",
          action: {
            type: "uri",
            label: "ดูรายละเอียด",
            uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/orders`,
          },
        },
      ],
    },
  },
});

/**
 * Flex Message for Order Status Update
 */
export const orderStatusUpdateFlex = (orderId: string, statusText: string, description: string, color: string = "#3b82f6"): LineFlexMessage => ({
  type: "flex",
  altText: `อัพเดทสถานะออเดอร์ ${orderId}`,
  contents: {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "อัพเดทสถานะ! 🕒",
          weight: "bold",
          size: "sm",
          color: "#aaaaaa",
        },
        {
          type: "text",
          text: statusText,
          weight: "bold",
          size: "xl",
          color: color,
        },
        {
          type: "text",
          text: description,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
        {
          type: "separator",
          margin: "md",
        },
        {
          type: "box",
          layout: "baseline",
          spacing: "sm",
          margin: "md",
          contents: [
            {
              type: "text",
              text: "ออเดอร์",
              color: "#aaaaaa",
              size: "xs",
              flex: 1,
            },
            {
              type: "text",
              text: orderId,
              color: "#666666",
              size: "xs",
              flex: 4,
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
          style: "link",
          height: "sm",
          action: {
            type: "uri",
            label: "ตรวจสอบสถานะ",
            uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/orders`,
          },
        },
      ],
    },
  },
});

/**
 * Flex Message for Rubber Accepted
 */
export const rubberAcceptedFlex = (orderId: string, rubberName: string): LineFlexMessage => 
  orderStatusUpdateFlex(orderId, "มี Rubber รับงานแล้ว!", `คุณ ${rubberName} กำลังเดินทางไปรับผ้าของคุณครับ`, "#10b981");

/**
 * Flex Message for Washing
 */
export const washingOrderFlex = (orderId: string): LineFlexMessage => 
  orderStatusUpdateFlex(orderId, "กำลังซักรีด...", `ออเดอร์ของคุณเข้าสู่กระบวนการซักรีดแล้วครับ`, "#6366f1");

/**
 * Flex Message for Rubber heading to Store
 */
export const deliveringToStoreFlex = (orderId: string): LineFlexMessage => 
  orderStatusUpdateFlex(orderId, "กำลังนำส่งร้านซัก", `รับเบอร์ได้รับผ้าของคุณแล้ว และกำลังเดินทางไปที่ร้านซักให้คุณครับ`, "#3b82f6");

/**
 * Flex Message for Ready for Delivery
 */
export const readyForDeliveryFlex = (orderId: string): LineFlexMessage => 
  orderStatusUpdateFlex(orderId, "ผ้าซักเสร็จแล้ว! ✨", `ออเดอร์ของคุณซักเสร็จเรียบร้อยแล้ว กำลังรอรับเบอร์มารับเพื่อนำไปส่งคืนให้คุณครับ`, "#f59e0b");

/**
 * Flex Message for Rubber heading to Customer
 */
export const deliveringToCustomerFlex = (orderId: string): LineFlexMessage => 
  orderStatusUpdateFlex(orderId, "กำลังนำผ้าไปส่งคืน", `รับเบอร์ได้รับผ้าสะอาดของคุณแล้ว และกำลังเดินทางไปส่งคืนให้คุณที่บ้านครับ`, "#10b981");

/**
 * Flex Message for New Job Available (For Rubbers)
 */
export const rubberNewJobFlex = (orderId: string, type: string, earn: number): LineFlexMessage => 
  orderStatusUpdateFlex(
    orderId, 
    "💸 มีงานใหม่เข้า!", 
    `ประเภท: ${type === 'ready_for_pickup' ? 'ส่งผ้าคืนลูกค้า' : 'รับผ้าจากลูกค้า'}\nรายได้: ฿${earn}\nกดเข้าแอปเพื่อรับงานด่วน!`, 
    "#f59e0b"
  );

/**
 * Flex Message for New Order Received (For Stores)
 */
export const storeOrderAlertFlex = (orderId: string): LineFlexMessage => 
  orderStatusUpdateFlex(
    orderId, 
    "🧺 ออเดอร์ใหม่เข้า!", 
    `มีลูกค้าสั่งบริการใหม่ครับ ตรวจสอบรายละเอียดและเตรียมรับผ้าจากรับเบอร์ได้เลย`, 
    "#6366f1"
  );

/**
 * Flex Message for Completed
 */
export const orderCompletedFlex = (orderId: string): LineFlexMessage => ({
  type: "flex",
  altText: "ออเดอร์ส่งสำเร็จแล้ว!",
  contents: {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://app.rubjob-all.com/images/mascot-chill.png",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "fit",
      backgroundColor: "#F0Fdf4"
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "งานเสร็จสิ้น! ✨",
          weight: "bold",
          size: "xl",
          color: "#10b981",
        },
        {
          type: "text",
          text: `ออเดอร์ ${orderId} ถูกจัดส่งเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ Rubjob ครับ`,
          wrap: true,
          size: "sm",
          color: "#4b5563",
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
          color: "#10b981",
          action: {
            type: "uri",
            label: "ให้คะแนนบริการ",
            uri: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}/activity`,
          },
        },
      ],
    },
  },
});
