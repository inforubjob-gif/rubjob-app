/**
 * RubJob Pricing & Commission Logic (2026 Guidelines)
 */

export interface PriceDetails {
  weightKg: number;
  distanceKm: number;
  isExpress: boolean;
  needsDetergent: boolean;
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

export function calculateOrderPrice(details: {
  weightKg: number;
  distanceKm: number;
  isExpress: boolean;
  needsDetergent: boolean;
}): PricingResult {
  const { weightKg, distanceKm, isExpress, needsDetergent } = details;

  // Distance limit handled in UI for better UX
  // if (distanceKm > 10) {
  //   throw new Error("Service unavailable: Distance exceeds 10km limit");
  // }

  // 1. Laundry Cost Calculation
  let laundryCost = 0;
  if (weightKg <= 9) laundryCost = 120;
  else if (weightKg <= 14) laundryCost = 140;
  else if (weightKg <= 18) laundryCost = 170;
  else laundryCost = 210; // Up to 28kg

  const laundryPlatformGP = laundryCost * 0.10;

  // 2. Delivery Fee Calculation
  let deliveryFee = 50; // Base price
  if (distanceKm >= 3) {
    deliveryFee += (distanceKm * 10);
  }

  // Rubber Deductions
  const rubberComm = deliveryFee * 0.15;
  const platformServiceFee = 15;
  const rubberNetIncome = deliveryFee - rubberComm - platformServiceFee;

  // 3. Add-ons
  let addonsTotal = 0;
  if (isExpress) addonsTotal += 20;
  if (needsDetergent) addonsTotal += 20;

  // 4. Totals
  const finalLaundry = Math.ceil(laundryCost);
  const finalDelivery = Math.ceil(deliveryFee);
  const finalAddons = Math.ceil(addonsTotal);
  const customerTotal = finalLaundry + finalDelivery + finalAddons;
  
  const platformTotalRevenue = laundryPlatformGP + rubberComm + platformServiceFee;

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
