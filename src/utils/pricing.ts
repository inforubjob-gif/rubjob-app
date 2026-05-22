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
}

export interface PricingResult {
  customerTotal: number;
  rubberNetIncome: number;
  platformTotalRevenue: number;
  breakdown: {
    laundry: number;
    delivery: number;
    addons: number;
  };
}

export function calculateOrderPrice(
  details: PriceDetails,
  config: PricingConfig
): PricingResult {
  const { weightKg, distanceKm, isExpress, needsDetergent, withFolding } = details;

  // 1. Laundry Cost Calculation
  let laundryCost = 0;
  if (weightKg <= 9) laundryCost = 120;
  else if (weightKg <= 14) laundryCost = 140;
  else if (weightKg <= 18) laundryCost = 170;
  else laundryCost = 210; // Up to 28 kg.

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
      delivery: finalDelivery,
      addons: finalAddons,
    },
  };
}
