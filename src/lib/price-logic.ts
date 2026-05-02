/**
 * Price Calculation Logic with Surge and Fees
 */
export function calculateFinalPrice(basePrice: number, surgeMultiplier: number = 1.0, discount: number = 0) {
  const priceAfterSurge = basePrice * surgeMultiplier;
  return Math.max(0, priceAfterSurge - discount);
}

/**
 * Cancellation Fee Logic
 * If cancelled after a partner has accepted, apply a fee.
 */
export function getCancellationFee(orderStatus: string, basePrice: number) {
  const activeStatuses = ['picking_up', 'delivering_to_store', 'washing', 'ready_for_pickup', 'accepted', 'in_progress'];
  
  if (activeStatuses.includes(orderStatus)) {
    // 10% of base price or minimum 20 THB
    return Math.max(20, basePrice * 0.1);
  }
  
  return 0;
}
