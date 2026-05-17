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
): Promise<{ id: string; lineUserId: string | null; preferences: string }[]> {
  const { province: orderProvince } = parseOrderAddress(orderAddress);
  
  // Select ALL rubbers — not just those with lineUserId
  // Rubbers registered via web (phone+password) may not have linked LINE yet
  const { results: allRubbers } = await db.prepare(`
    SELECT id, lineUserId, preferences, address
    FROM rubber_users
  `).all() as any;

  const eligible: { id: string; lineUserId: string | null; preferences: string }[] = [];

  for (const r of (allRubbers || [])) {
    try {
      const prefs = JSON.parse(r.preferences || "{}");
      
      // Must be online (default to true if undefined)
      if (prefs.workStatus === false) {
         db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`FILTER-WORK-${r.id}-${Date.now()}`, 'filter_skip', 'workStatus is false', null).run().catch(() => {});
         continue;
      }
      
      // Geo-filter: check province match
      if (orderProvince) {
        const rubberAddr = parseRubberAddress(r.address);
        
        // 🛡️ Phase 2.3: Re-enabled geo-filter — rubber must be in same province as order
        if (rubberAddr.province && rubberAddr.province !== orderProvince) {
          db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`FILTER-GEO-${r.id}-${Date.now()}`, 'filter_skip', `Order: ${orderProvince}, Rubber: ${rubberAddr.province}`, null).run().catch(() => {});
          continue;
        }
        // If rubber has no province registered (legacy data) -> include them
      }
      
      eligible.push({
        id: r.id,
        lineUserId: r.lineUserId || null,
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
  // Get Rubber LINE OA token — MUST be separate from Customer OA
  // Priority: env variable → DB setting (admin dashboard)
  // ⚠️ Do NOT fallback to customer token — they are separate LINE OAs!
  let rubberToken = null;
  try {
    // Check DB with key 'line_token_rubber' (matches admin settings)
    const setting = await db.prepare(
      "SELECT value FROM system_settings WHERE key = 'line_token_rubber'"
    ).first() as any;
    if (setting?.value) rubberToken = setting.value;
  } catch (e) {
    console.error("[DISPATCH] Failed to read rubber token from DB:", e);
  }
  
  if (!rubberToken) {
    rubberToken = env.LINE_CHANNEL_ACCESS_TOKEN_RUBBER;
  }
  if (!rubberToken) {
    console.warn("⚠️ [DISPATCH] Rubber LINE OA token is NOT configured! Rubber LINE push will be SKIPPED. Set 'LINE_CHANNEL_ACCESS_TOKEN_RUBBER' in env or 'line_token_rubber' in Admin Settings.");
  } else {
    console.log(`📡 [DISPATCH] Rubber token: SET`);
  }

  const { sendLinePush, rubberNewJobFlex } = await import("./line");
  const { createNotification } = await import("./notify-server");

  // 10% commission + 10 THB Platform Fee
  const totalOrderEarn = deliveryFee - (deliveryFee * 0.10) - 10;
  const legEarn = Math.max(totalOrderEarn * 0.5, 0);

  const eligibleRubbers = await getEligibleRubbers(db, orderAddress);
  
  console.log(`📡 [DISPATCH] Order ${orderId}: Broadcasting to ${eligibleRubbers.length} eligible rubbers (status: ${status}, deliveryFee: ${deliveryFee}, legEarn: ${legEarn.toFixed(0)})`);

  if (eligibleRubbers.length === 0) {
    console.warn(`⚠️ [DISPATCH] Order ${orderId}: No eligible rubbers found! Check workStatus and address matching.`);
  }

  for (const r of eligibleRubbers) {
    // 1. In-App Notification (always works — uses rubber's primary ID)
    try {
      await createNotification(db, {
        userId: r.id,
        userType: "rubber",
        type: "order_update",
        title: "💸 มีงานใหม่เข้า!",
        message: `งาน #${orderId.slice(-6)} — รายได้ ฿${legEarn.toFixed(2)} กดรับงานด่วน!`,
        link: "/rubber"
      });
      console.log(`  ✅ [DISPATCH] In-app notification → rubber ${r.id}`);
    } catch (e) {
      console.error(`  ❌ [DISPATCH] In-app notification failed for ${r.id}:`, e);
    }

    // 2. Check if rubber has Web Push subscription (PWA installed)
    let hasPushSubscription = false;
    try {
      const pushSub = await db.prepare(
        `SELECT id FROM push_subscriptions WHERE userId = ? AND userType = 'rubber' LIMIT 1`
      ).bind(r.id).first();
      hasPushSubscription = !!pushSub;
    } catch (e) {
      // Table might not exist yet, fall through to LINE
    }

    if (hasPushSubscription) {
      // 3a. Web Push (PWA installed — skip LINE to save quota)
      try {
        const pushSubs = await db.prepare(
          `SELECT endpoint FROM push_subscriptions WHERE userId = ? AND userType = 'rubber'`
        ).bind(r.id).all();
        
        const pushPayload = JSON.stringify({
          title: "💸 งานใหม่เข้า!",
          body: `งาน #${orderId.slice(-6)} — รายได้ ฿${legEarn.toFixed(2)} กดรับงานด่วน!`,
          url: "/rubber"
        });

        let anyPushSucceeded = false;

        for (const sub of (pushSubs.results || [])) {
          try {
            const pushRes = await fetch(sub.endpoint as string, {
              method: "POST",
              headers: { "Content-Type": "application/json", "TTL": "86400" },
              body: pushPayload,
            });

            if (pushRes.ok || pushRes.status === 201) {
              anyPushSucceeded = true;
            } else if (pushRes.status === 404 || pushRes.status === 410) {
              // 410 Gone = unsubscribed / app uninstalled
              // 404 = endpoint no longer exists
              console.log(`  🗑️ [DISPATCH] Push endpoint expired (${pushRes.status}), cleaning up: ${r.id}`);
              await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(sub.endpoint).run().catch(() => {});
            } else {
              console.warn(`  ⚠️ [DISPATCH] Push returned ${pushRes.status} for ${r.id}`);
            }
          } catch {
            // Network error — endpoint unreachable, clean up
            console.log(`  🗑️ [DISPATCH] Push endpoint unreachable, cleaning up: ${r.id}`);
            await db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(sub.endpoint).run().catch(() => {});
          }
        }

        if (anyPushSucceeded) {
          console.log(`  ✅ [DISPATCH] Web Push → rubber ${r.id} (LINE skipped — PWA active)`);
          await db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`DISPATCH-PUSH-${orderId}-${r.id}-${Date.now()}`, 'dispatch_webpush', 'PWA active', null).run().catch(() => {});
        } else {
          // All push subscriptions failed — fall back to LINE
          console.warn(`  ⚠️ [DISPATCH] All push endpoints failed for ${r.id}, falling back to LINE`);
          hasPushSubscription = false;
        }
      } catch (pushErr) {
        console.error(`  ❌ [DISPATCH] Web Push failed for ${r.id}, falling back to LINE:`, pushErr);
        hasPushSubscription = false; // Fall through to LINE below
      }
    }
    
    if (!hasPushSubscription) {
      // 3b. LINE Push Message (no PWA — only if rubber has linked LINE + token exists)
      if (rubberToken && r.lineUserId) {
        try {
          const res = await sendLinePush(
            r.lineUserId,
            [rubberNewJobFlex(orderId, status, legEarn)],
            rubberToken
          );
          console.log(`  ✅ [DISPATCH] LINE push → ${r.lineUserId}`);
          await db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`DISPATCH-${orderId}-${r.id}-${Date.now()}`, 'dispatch_success', JSON.stringify(res), null).run().catch(() => {});
        } catch (err: unknown) {
          const errMsg = (err instanceof Error) ? err.message : String(err);
          console.error(`  ❌ [DISPATCH] LINE push failed for ${r.lineUserId}:`, errMsg);
          await db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`DISPATCH-${orderId}-${r.id}-${Date.now()}`, 'dispatch_fail', r.lineUserId || '', errMsg).run().catch(() => {});
        }
      } else {
        console.warn(`  ⚠️ [DISPATCH] No notification channel for ${r.id}: pushSub=${hasPushSubscription}, token=${!!rubberToken}, lineUserId=${r.lineUserId}`);
      }
    }
  }
  
  console.log(`📡 [DISPATCH] Order ${orderId}: Broadcast complete.`);
}

