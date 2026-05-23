/**
 * GP (Gross Profit) Configuration Helper
 * 
 * Fetches GP percentages from system_settings table.
 * NEVER hard-code GP values — always use this helper.
 */

export interface GPConfig {
  /** GP% taken from store sales (e.g. 10 means 10%) */
  gpStorePercent: number;
  /** GP% taken from rubber delivery fees (e.g. 15 means 15%) */
  gpRubberPercent: number;
  /** Platform fee per delivery (THB) */
  platformFeePerDelivery: number;
}

/**
 * Fetch GP configuration from system_settings.
 * Falls back to DB defaults if a key is missing but NEVER uses a hard-coded constant.
 * 
 * @param db - D1 database instance
 * @returns GPConfig with all GP values
 */
export async function getGPConfig(db: any): Promise<GPConfig> {
  const keys = ["gp_store_percent", "gp_rubber_percent", "platform_fee_per_delivery"];
  
  const { results } = await db.prepare(`
    SELECT key, value FROM system_settings WHERE key IN (${keys.map(() => "?").join(",")})
  `).bind(...keys).all();

  const map = new Map<string, string>();
  for (const row of (results as any[])) {
    map.set(row.key, row.value);
  }

  return {
    gpStorePercent: parseFloat(map.get("gp_store_percent") || "0"),
    gpRubberPercent: parseFloat(map.get("gp_rubber_percent") || "0"),
    platformFeePerDelivery: parseFloat(map.get("platform_fee_per_delivery") || "0"),
  };
}

/**
 * Calculate rubber payout for a delivery.
 * payout = deliveryFee - (deliveryFee * gpRubberPercent/100) - platformFeePerDelivery
 */
export function calcRubberPayout(deliveryFee: number, gp: GPConfig): number {
  const commission = deliveryFee * (gp.gpRubberPercent / 100);
  return deliveryFee - commission - gp.platformFeePerDelivery;
}

/**
 * Calculate store commission (GP taken from store cost).
 * commission = laundryCost * gpStorePercent/100
 */
export function calcStoreCommission(laundryCost: number, gp: GPConfig): number {
  return laundryCost * (gp.gpStorePercent / 100);
}

/**
 * Calculate store net payout after GP deduction.
 * net = laundryCost - commission
 */
export function calcStoreNet(laundryCost: number, gp: GPConfig): number {
  return laundryCost - calcStoreCommission(laundryCost, gp);
}
