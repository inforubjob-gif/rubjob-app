/**
 * Omise Payment Utility
 * 
 * Handles interaction with Omise API for PromptPay and Credit Cards.
 * Requires OMISE_SECRET_KEY and OMISE_PUBLIC_KEY.
 */

const OMISE_API_URL = "https://api.omise.co";

export interface OmiseChargeParams {
  amount: number; // In subunits (e.g., Satang)
  currency: string;
  source?: string;
  card?: string;
  return_uri?: string;
  description?: string;
  metadata?: any;
}

export async function createOmiseCharge(params: OmiseChargeParams, secretKey: string) {
  if (!secretKey) {
    throw new Error("OMISE_SECRET_KEY is not set.");
  }

  const auth = btoa(secretKey + ":");
  
  try {
    const response = await fetch(`${OMISE_API_URL}/charges`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Omise API error: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to create Omise charge:", error);
    throw error;
  }
}

/**
 * Specifically for PromptPay QR creation
 */
export async function createPromptPayCharge(amount: number, orderId: string, secretKey: string) {
  return createOmiseCharge({
    amount: Math.round(amount * 100), // Convert Baht to Satang
    currency: "thb",
    source: "promptpay",
    description: `Payment for Order ${orderId}`,
    metadata: { orderId },
  }, secretKey);
}
