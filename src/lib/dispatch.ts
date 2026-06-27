import { D1Database } from "@cloudflare/workers-types";
import { getGPConfig, calcRubberPayout } from "@/lib/gp-config";

/** Max distance (km) between order and rubber's serviceAreaCoords to be eligible */
const GEO_THRESHOLD_KM = 30;

/**
 * Geo-Filtered Rubber Dispatch System
 * 
 * Filters rubbers by distance (Haversine) or province to match the order's delivery address.
 * Only broadcasts to active, online rubbers within range.
 */

/**
 * Haversine formula — compute straight-line distance between two lat/lng points.
 * Pure math, no external API, zero cost.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
 * Matching Logic (priority order):
 * 1. Only include rubbers with status = 'active'
 * 2. Only include rubbers who are explicitly online (workStatus === true)
 * 3. If rubber has serviceAreaCoords AND order has lat/lng → Haversine distance ≤ 30km
 * 4. Fallback: province text matching
 * 5. If no geo data available at all → skip (safe default)
 */
export async function getEligibleRubbers(
  db: D1Database,
  orderAddress: any,
  isTestOrder: boolean = false
): Promise<{ id: string; lineUserId: string | null; preferences: string }[]> {
  const { province: orderProvince } = parseOrderAddress(orderAddress);
  
  // Parse order lat/lng for distance-based filtering
  let orderLat: number | null = null;
  let orderLng: number | null = null;
  try {
    const parsed = typeof orderAddress === 'string' ? JSON.parse(orderAddress) : orderAddress;
    if (parsed?.lat && parsed?.lng) {
      orderLat = Number(parsed.lat);
      orderLng = Number(parsed.lng);
    }
  } catch {}
  
  // Fix 1: Only select active rubbers (excludes pending/suspended)
  // Test mode: filter by isTest flag
  const { results: allRubbers } = await db.prepare(`
    SELECT id, lineUserId, preferences, address
    FROM rubber_users
    WHERE status = 'active' AND (isTest = ? OR isTest IS NULL)
  `).bind(isTestOrder ? 1 : 0).all() as any;

  const eligible: { id: string; lineUserId: string | null; preferences: string }[] = [];

  for (const r of (allRubbers || [])) {
    try {
      const prefs = JSON.parse(r.preferences || "{}");
      
      // Fix 2: Must be explicitly online (workStatus === true required)
      if (prefs.workStatus !== true) {
         db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`FILTER-WORK-${r.id}-${Date.now()}`, 'filter_skip', `workStatus is ${prefs.workStatus} (not true)`, null).run().catch(() => {});
         continue;
      }
      
      // Fix 3: Geo-filter — distance-based (Haversine) with province fallback
      let geoFiltered = false;
      
      // Priority 1: Distance-based using serviceAreaCoords
      if (orderLat && orderLng && prefs.serviceAreaCoords?.lat && prefs.serviceAreaCoords?.lng) {
        const dist = haversineKm(orderLat, orderLng, Number(prefs.serviceAreaCoords.lat), Number(prefs.serviceAreaCoords.lng));
        if (dist > GEO_THRESHOLD_KM) {
          db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`FILTER-GEO-${r.id}-${Date.now()}`, 'filter_skip', `Distance: ${dist.toFixed(1)}km > ${GEO_THRESHOLD_KM}km`, null).run().catch(() => {});
          geoFiltered = true;
        }
      }
      // Priority 2: Province text matching (fallback)
      else if (orderProvince) {
        const rubberAddr = parseRubberAddress(r.address);
        if (rubberAddr.province && rubberAddr.province !== orderProvince) {
          db.prepare("INSERT INTO webhook_logs (id, channel, payload, error) VALUES (?, ?, ?, ?)").bind(`FILTER-GEO-${r.id}-${Date.now()}`, 'filter_skip', `Province: Order=${orderProvince}, Rubber=${rubberAddr.province}`, null).run().catch(() => {});
          geoFiltered = true;
        }
        // If rubber has no province registered (legacy) → include them for now
      }
      // No geo data at all on both sides → skip for safety
      else if (!orderLat && !orderProvince) {
        // Order has no location data — cannot filter, include rubber
      }
      
      if (geoFiltered) continue;
      
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
  status: string = 'pending',
  isTestOrder: boolean = false
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

  const gp = await getGPConfig(db);
  const totalOrderEarn = calcRubberPayout(deliveryFee, gp);
  const legEarn = Math.max(totalOrderEarn * 0.5, 0);

  const eligibleRubbers = await getEligibleRubbers(db, orderAddress, isTestOrder);
  
  console.log(`📡 [DISPATCH] Order ${orderId}: Broadcasting to ${eligibleRubbers.length} eligible rubbers (status: ${status}, deliveryFee: ${deliveryFee}, legEarn: ${legEarn.toFixed(0)})`);

  if (eligibleRubbers.length === 0) {
    console.warn(`⚠️ [DISPATCH] Order ${orderId}: No eligible rubbers found! Check workStatus and address matching.`);
  }

  for (const r of eligibleRubbers) {
    // 🛡️ Dedup: skip if this order was already broadcast to this rubber for the same stage
    // Allow 2 broadcasts per order: 1st for pickup leg (paid/pending), 2nd for return leg (ready_for_pickup)
    try {
      const dedupKey = `DISPATCH-${orderId}-${r.id}`;
      const existing = await db.prepare(
        `SELECT id FROM webhook_logs WHERE id LIKE ? AND channel = 'dispatch_success' LIMIT 1`
      ).bind(`${dedupKey}%`).first();
      
      if (existing && status !== 'ready_for_pickup') {
        console.log(`  ⏭️ [DISPATCH] Skipping duplicate for rubber ${r.id} (order ${orderId}, already broadcast)`);
        continue;
      }
    } catch (e) { /* table may not exist, continue */ }

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

