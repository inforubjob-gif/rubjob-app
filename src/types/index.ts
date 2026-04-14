// ─── RUBJOB Shared Types ───

export interface User {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
  statusMessage?: string;
  phone?: string;
  role?: "user" | "store_admin" | "system_admin" | "driver";
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
  isActive: boolean;
  createdAt: string;
}

export type OrderStatus =
  | "pending"
  | "picking_up"
  | "delivering_to_store"
  | "washing"
  | "ready_for_pickup"
  | "delivering_to_customer"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  userId: string;
  storeId: string;
  service: ServiceType;
  status: OrderStatus;
  items: OrderItem[];
  address: Address;
  pickupDate: string;
  pickupTimeSlot: string;
  deliveryDate?: string;
  laundryFee: number;
  deliveryFee: number;
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
  | "home_cleaning" | "aircon_service" | "personal_assistant" | "companionship";

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
