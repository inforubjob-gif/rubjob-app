/**
 * LINE Messaging API Utility
 * 
 * Used to send push notifications to users.
 * Requires LINE_CHANNEL_ACCESS_TOKEN in environment variables.
 */

export async function sendLinePush(userId: string, messages: any[], accessToken: string) {
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

    return await response.json();
  } catch (error) {
    console.error("Failed to send LINE push notification:", error);
    return null;
  }
}

/**
 * Helper to create a text message
 */
export const textMessage = (text: string) => ({
  type: "text",
  text,
});

/**
 * Helper to create a Flex Message for Booking Confirmation
 */
export const bookingConfirmationFlex = (orderId: string, serviceName: string, totalPrice: number) => ({
  type: "flex",
  altText: "ยืนยันการขอรับบริการ Rubjob",
  contents: {
    type: "bubble",
    hero: {
      type: "image",
      url: "https://images.unsplash.com/photo-1545173168-9f1967e49549?w=800&q=80",
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "การจองลุล่วง! 🎉",
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
