import { D1Database } from "@cloudflare/workers-types";

/**
 * Geo-Filtered Rubber Dispatch System
 * 
 * Instead of broadcasting to ALL online rubbers nationwide,
 * this module filters rubbers by province/area to match the order's delivery address.
 * This saves LINE Push Message quota and reduces noise for drivers.
 */

/**
 * Parse order address to extract province and area
 */
function parseOrderAddress(address: any): { province: string | null; area: string | null } {
  try {
    const parsed = typeof address === 'string' ? JSON.parse(address) : address;
    return {
      province: parsed?.province || null,
      area: parsed?.area || parsed?.subDistrict || null,
    };
  } catch {
    return { province: null, area: null };
  }
}

/**
 * Parse rubber address string (stored as "ย่าน/ตำบล: xxx\nจังหวัด: yyy")
 */
function parseRubberAddress(address: string | null): { province: string | null; area: string | null } {
  if (!address) return { province: null, area: null };
  let province: string | null = null;
  let area: string | null = null;
  
  const lines = address.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('จังหวัด:')) {
      province = trimmed.replace('จังหวัด:', '').trim();
    }
    if (trimmed.startsWith('ย่าน/ตำบล:') || trimmed.startsWith('ย่าน:') || trimmed.startsWith('ตำบล:')) {
      area = trimmed.split(':').slice(1).join(':').trim();
    }
  }
  
  return { province, area };
}

/**
 * Get list of eligible rubbers for an order based on geo-matching.
 * 
 * Matching Logic:
 * 1. If rubber has a registered province AND order has a province -> must match
 * 2. If rubber has no registered province (legacy/old data) -> include them (backwards compatible)
 * 3. Only include rubbers who are online (workStatus === true)
 */
export async function getEligibleRubbers(
  db: D1Database,
  orderAddress: any
): Promise<{ lineUserId: string; preferences: string }[]> {
  const { province: orderProvince } = parseOrderAddress(orderAddress);
  
  const { results: allRubbers } = await db.prepare(`
    SELECT lineUserId, preferences, address
    FROM rubber_users
    WHERE lineUserId IS NOT NULL
  `).all() as any;

  const eligible: { lineUserId: string; preferences: string }[] = [];

  for (const r of (allRubbers || [])) {
    try {
      const prefs = JSON.parse(r.preferences || "{}");
      
      // Must be online
      if (prefs.workStatus !== true) continue;
      
      // Geo-filter: check province match
      if (orderProvince) {
        const rubberAddr = parseRubberAddress(r.address);
        
        // If rubber has a registered province and it doesn't match -> skip
        if (rubberAddr.province && rubberAddr.province !== orderProvince) {
          continue;
        }
        // If rubber has no province registered (legacy data) -> include them
      }
      
      eligible.push({
        lineUserId: r.lineUserId,
        preferences: r.preferences || "{}",
      });
    } catch (e) {
      // Skip rubbers with malformed data
    }
  }

  return eligible;
}

/**
 * Broadcast a new job notification to geo-eligible rubbers only.
 * Sends BOTH:
 * 1. LINE Push Message (if rubber has linked LINE + token is valid)
 * 2. In-App Notification (always, so rubber sees it in their notification center)
 */
export async function broadcastToEligibleRubbers(
  db: D1Database,
  env: any,
  orderId: string,
  orderAddress: any,
  deliveryFee: number,
  status: string = 'pending'
) {
  // Get LINE tokens
  let rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
  if (!rubberToken) {
    const setting = await db.prepare(
      "SELECT value FROM system_settings WHERE key = 'line_channel_access_token_rubber'"
    ).first() as any;
    if (setting?.value) rubberToken = setting.value;
  }
  if (!rubberToken) {
    let customerToken = env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!customerToken) {
      const setting = await db.prepare(
        "SELECT value FROM system_settings WHERE key = 'line_channel_access_token_regular'"
      ).first() as any;
      if (setting?.value) customerToken = setting.value;
    }
    rubberToken = customerToken;
  }

  const { sendLinePush, rubberNewJobFlex } = await import("./line");
  const { createNotification } = await import("./notify-server");

  // 15% commission + 15 THB Platform Fee
  const totalOrderEarn = deliveryFee - (deliveryFee * 0.15) - 15;
  const legEarn = Math.max(totalOrderEarn * 0.5, 0);

  const eligibleRubbers = await getEligibleRubbers(db, orderAddress);
  
  console.log(`📡 [DISPATCH] Order ${orderId}: Broadcasting to ${eligibleRubbers.length} eligible rubbers (status: ${status}, deliveryFee: ${deliveryFee}, legEarn: ${legEarn.toFixed(0)})`);

  if (eligibleRubbers.length === 0) {
    console.warn(`⚠️ [DISPATCH] Order ${orderId}: No eligible rubbers found! Check workStatus and address matching.`);
  }

  for (const r of eligibleRubbers) {
    // 1. In-App Notification (always works, no external dependency)
    try {
      // Use the rubber's internal ID (not lineUserId) for the notification
      // We need to look up the rubber's ID from their lineUserId
      const rubberRecord = await db.prepare(
        "SELECT id FROM rubber_users WHERE lineUserId = ?"
      ).bind(r.lineUserId).first() as any;

      const rubberInternalId = rubberRecord?.id || r.lineUserId;

      await createNotification(db, {
        userId: rubberInternalId,
        userType: "rubber",
        type: "order_update",
        title: "💸 มีงานใหม่เข้า!",
        message: `งาน #${orderId.slice(-6)} — รายได้ ฿${legEarn.toFixed(0)} กดรับงานด่วน!`,
        link: "/rubber"
      });
      console.log(`  ✅ [DISPATCH] In-app notification sent to rubber ${rubberInternalId}`);
    } catch (e) {
      console.error(`  ❌ [DISPATCH] In-app notification failed for ${r.lineUserId}:`, e);
    }

    // 2. LINE Push Message (depends on valid token + rubber has added LINE OA)
    if (rubberToken) {
      await sendLinePush(
        r.lineUserId,
        [rubberNewJobFlex(orderId, status, legEarn)],
        rubberToken
      ).catch((err: any) => {
        console.error(`  ❌ [DISPATCH] LINE push failed for ${r.lineUserId}:`, err?.message || err);
      });
    }
  }
  
  console.log(`📡 [DISPATCH] Order ${orderId}: Broadcast complete.`);
}

