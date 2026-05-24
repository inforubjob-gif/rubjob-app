/**
 * RubJob Pricing & Commission Logic (2026 Guidelines)
 * 
 * ⚠️ All GP values come from PricingConfig — NEVER hard-code!
 * Frontend must fetch /api/settings/pricing first.
 */

export interface PricingConfig {
  gpRubberPercent: number;      // e.g. 10 = 10%
  platformFeePerDelivery: number; // e.g. 10 THB
  deliveryFeeBase: number;      // e.g. 50 THB
}

export interface PriceDetails {
  weightKg: number;
  distanceKm: number;
  isExpress: boolean;
  needsDetergent: boolean;
  withFolding: boolean;
  machineSize?: 'small' | 'large';
  washMode?: 'standard' | 'extra';
  /** Override prices from store cost matrix (if available) */
  storePrices?: {
    standard?: number;
    extra?: number;
  };
  laundryAppPrice?: number;
  storeCostPrice?: number;
}

export interface PricingResult {
  customerTotal: number;
  rubberNetIncome: number;
  platformTotalRevenue: number;
  breakdown: {
    laundry: number;
    storeCost: number;
    delivery: number;
    addons: number;
  };
}

export function calculateOrderPrice(
  details: PriceDetails,
  config: PricingConfig
): PricingResult {
  const { weightKg, distanceKm, isExpress, needsDetergent, withFolding, machineSize, washMode, storePrices, laundryAppPrice, storeCostPrice } = details;

  // 1. Laundry App Price & Store Cost
  let laundryCost = 0; // Customer App Price
  let laundryCostBase = 0; // Store Cost Price (priceStandard)
  
  if (laundryAppPrice !== undefined) {
    laundryCost = laundryAppPrice;
    // Default cost to 80% of app price if not provided
    laundryCostBase = storeCostPrice !== undefined ? storeCostPrice : laundryAppPrice * 0.8;
  } else if (storePrices && (storePrices.standard || storePrices.extra)) {
    // Legacy support for non-combo machines
    laundryCost = washMode === 'extra' 
      ? (storePrices.extra || storePrices.standard || 100)
      : (storePrices.standard || 100);
      
    laundryCostBase = storePrices.standard || 80;
  } else if (machineSize && washMode) {
    // MARU-style combo machine pricing (fallback hardcode)
    const priceMatrix: Record<string, Record<string, number>> = {
      small:    { standard: 100, extra: 140 },
      large:    { standard: 120, extra: 160 },
    };
    laundryCost = priceMatrix[machineSize]?.[washMode] ?? 100;
    laundryCostBase = laundryCost * 0.8; // Fallback cost is 80% of app price
  } else {
    // Fallback: weight-based (New RUBJOB app pricing)
    if (weightKg <= 9) laundryCost = 120;
    else if (weightKg <= 14) laundryCost = 140;
    else if (weightKg <= 18) laundryCost = 170;
    else laundryCost = 210;
  }

  // 2. Delivery Fee Calculation (ระยะทางไปกลับ แล้วค่อยคิดเงิน)
  const roundTripKm = distanceKm * 2;
  let deliveryFee = config.deliveryFeeBase;
  if (roundTripKm > 3) {
    deliveryFee += ((roundTripKm - 3) * 10);
  }

  // Rubber Deductions (from settings, not hard-coded)
  const rubberComm = deliveryFee * (config.gpRubberPercent / 100);
  const platformServiceFee = config.platformFeePerDelivery;
  const rubberNetIncome = deliveryFee - rubberComm - platformServiceFee;

  // 3. Add-ons
  let addonsTotal = 0;
  if (isExpress) addonsTotal += 20;
  if (needsDetergent) addonsTotal += 15;
  if (withFolding) addonsTotal += 10;

  // 4. Totals
  const finalLaundry = Math.ceil(laundryCost);
  const finalStoreCost = Math.ceil(laundryCostBase);
  const finalDelivery = Math.ceil(deliveryFee);
  const finalAddons = Math.ceil(addonsTotal);
  const customerTotal = finalLaundry + finalDelivery + finalAddons;
  
  const platformTotalRevenue = rubberComm + platformServiceFee;

  return {
    customerTotal,
    rubberNetIncome,
    platformTotalRevenue,
    breakdown: {
      laundry: finalLaundry,
      storeCost: finalStoreCost,
      delivery: finalDelivery,
      addons: finalAddons,
    }
  };
}
