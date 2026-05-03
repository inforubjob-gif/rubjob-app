// ─── RUBJOB Shared Types ───

export interface User {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
  statusMessage?: string;
  phone?: string;
  role?: "user" | "store_admin" | "system_admin" | "driver" | "specialist";
  assignedStoreId?: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  baseDeliveryFee: number;
  extraFeePerKm: number;
  phone?: string;
  lineUserId?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Order Types ───

/** Determines the fulfillment flow: logistics (rider+store) vs direct_service (provider only) */
export type OrderType = "logistics" | "direct_service";

export type OrderStatus =
  | "pending"
  | "picking_up"
  | "delivering_to_store"
  | "washing"
  | "ready_for_pickup"
  | "delivering_to_customer"
  | "completed"
  | "cancelled"
  // Direct-service specific statuses
  | "accepted"
  | "in_progress";

export interface Order {
  id: string;
  userId: string;
  orderType: OrderType;
  storeId?: string;
  providerId?: string;
  service: ServiceType;
  status: OrderStatus;
  items: OrderItem[];
  address: Address;
  pickupDate: string;
  pickupTimeSlot: string;
  deliveryDate?: string;
  laundryFee: number;
  deliveryFee: number;
  serviceFee?: number;
  distanceKm?: number;
  totalPrice: number;
  pickupDriverId?: string;
  deliveryDriverId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  pricePerUnit: number;
}

export type ServiceType = 
  | "wash_fold" | "dry_clean" | "iron_only" | "wash_iron" 
  | "home_cleaning" | "aircon_service" | "personal_assistant" | "companionship"
  | "gecko_catcher" | "fortune_telling" | "life_management" | "companion_friend";

export type ServiceCategory = "laundry" | "cleaning" | "maintenance" | "personal" | "friend" | "specialist";

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  unit: "piece" | "hour" | "session";
  icon: string;
  estimatedDays: number;
}

export interface Address {
  id: string;
  label: string;
  details: string;
  note?: string;
  isDefault?: boolean;
  lat?: number;
  lng?: number;
  fullAddress?: string; // keeping for compatibility during transition
}

export interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

// ─── Provider / Specialist Types ───

export interface ProviderUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  pictureUrl?: string;
  lineUserId?: string;
  /** Skills this provider offers (e.g. ["gecko_catcher", "companion_friend"]) */
  skills: string[];
  /** Provider sets their own pricing per skill */
  pricing: Record<string, number>;
  /** Unit per skill (hour, session, etc.) */
  pricingUnit: Record<string, string>;
  bio?: string;
  status: "pending" | "active" | "suspended" | "rejected";
  createdAt: string;
}
