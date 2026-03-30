import type { Service, Order, Address, TimeSlot, Store } from "@/types";

// ─── Services ───
export const SERVICES: Service[] = [
  {
    id: "wash_fold",
    name: "Wash & Fold",
    category: "laundry",
    description: "Everyday laundry, washed and neatly folded",
    basePrice: 129,
    unit: "piece",
    icon: "wash_fold",
    estimatedDays: 2,
  },
  {
    id: "dry_clean",
    name: "Dry Clean",
    category: "laundry",
    description: "Premium care for delicate fabrics & suits",
    basePrice: 249,
    unit: "piece",
    icon: "dry_clean",
    estimatedDays: 3,
  },
  {
    id: "iron_only",
    name: "Iron Only",
    category: "laundry",
    description: "Perfectly pressed, ready to wear",
    basePrice: 99,
    unit: "piece",
    icon: "iron_only",
    estimatedDays: 1,
  },
  {
    id: "wash_iron",
    name: "Wash & Iron",
    category: "laundry",
    description: "Full service wash with professional pressing",
    basePrice: 159,
    unit: "piece",
    icon: "wash_iron",
    estimatedDays: 2,
  },
  {
    id: "home_cleaning",
    name: "Home Cleaning",
    category: "cleaning",
    description: "Professional deep cleaning for your home",
    basePrice: 500,
    unit: "session",
    icon: "home_cleaning",
    estimatedDays: 1,
  },
  {
    id: "personal_assistant",
    name: "Personal Assistant",
    category: "personal",
    description: "Secretarial tasks, errands, or just accompaniment",
    basePrice: 300,
    unit: "hour",
    icon: "personal_assistant",
    estimatedDays: 0,
  },
  {
    id: "companionship",
    name: "Companionship",
    category: "friend",
    description: "Going to the doctor or sharing a meal together",
    basePrice: 200,
    unit: "hour",
    icon: "companionship",
    estimatedDays: 0,
  },
];

// ─── Time Slots ───
export const TIME_SLOTS: TimeSlot[] = [
  { id: "morning", label: "เช้า", startTime: "08:00", endTime: "10:00" },
  { id: "midday", label: "สาย", startTime: "10:00", endTime: "12:00" },
  { id: "afternoon", label: "บ่าย", startTime: "13:00", endTime: "15:00" },
  { id: "evening", label: "เย็น", startTime: "17:00", endTime: "19:00" },
  { id: "night", label: "ค่ำ", startTime: "19:00", endTime: "21:00" },
  { id: "late_night", label: "ดึก", startTime: "21:00", endTime: "23:00" },
  { id: "midnight", label: "เที่ยงคืน", startTime: "23:00", endTime: "01:00" },
  { id: "am1", label: "ตีหนึ่ง", startTime: "01:00", endTime: "03:00" },
  { id: "am3", label: "ตีสาม", startTime: "03:00", endTime: "05:00" },
  { id: "am5", label: "เช้ามืด", startTime: "05:00", endTime: "07:00" },
];

// ─── Mock Addresses ───
export const MOCK_ADDRESSES: Address[] = [
  {
    id: "addr_1",
    label: "Home",
    fullAddress: "123/45 Sukhumvit Soi 39, Klongton Nua, Wattana, Bangkok 10110",
    note: "Condo lobby, call on arrival",
    latitude: 13.736717,
    longitude: 100.573186
  },
  {
    id: "addr_2",
    label: "Office",
    fullAddress: "88 One Bangkok Tower, Wireless Rd, Lumphini, Pathum Wan, Bangkok 10330",
    latitude: 13.726717,
    longitude: 100.543186
  },
];

// ─── Mock Stores ───
export const MOCK_STORES: Store[] = [
  {
    id: "STORE-001",
    ownerId: "OWNER-1",
    name: "Clean & Clear Laundry (Thong Lo)",
    address: "Soi Thong Lo 10, Sukhumvit 55",
    lat: 13.732717,
    lng: 100.583186,
    serviceRadiusKm: 5,
    baseDeliveryFee: 50,
    extraFeePerKm: 10,
    isActive: true,
    createdAt: "2026-01-10T10:00:00Z"
  },
  {
    id: "STORE-002",
    ownerId: "OWNER-2",
    name: "Speedy Wash (Phrom Phong)",
    address: "Sukhumvit 39",
    lat: 13.736717,
    lng: 100.570186,
    serviceRadiusKm: 5,
    baseDeliveryFee: 40,
    extraFeePerKm: 15,
    isActive: true,
    createdAt: "2026-02-15T09:00:00Z"
  },
  {
    id: "STORE-003",
    ownerId: "OWNER-3",
    name: "Express Laundry (Silom)",
    address: "Silom Complex, Silom Rd",
    lat: 13.728717,
    lng: 100.533186,
    serviceRadiusKm: 5,
    baseDeliveryFee: 60,
    extraFeePerKm: 12,
    isActive: true,
    createdAt: "2026-03-01T11:00:00Z"
  }
];

// ─── Mock Orders ───
export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-2026-001",
    userId: "U1234567890",
    service: "wash_fold",
    status: "washing",
    items: [
      { name: "T-shirt", quantity: 5, pricePerUnit: 15 },
      { name: "Pants", quantity: 3, pricePerUnit: 25 },
      { name: "Towel", quantity: 2, pricePerUnit: 20 },
    ],
    address: MOCK_ADDRESSES[0],
    pickupDate: "2026-03-28",
    pickupTimeSlot: "Morning (08:00-10:00)",
    laundryFee: 190,
    deliveryFee: 40,
    storeId: "STORE-001",
    totalPrice: 230,
    pickupDriverId: "DRIVER-01",
    deliveryDriverId: "DRIVER-02",
    createdAt: "2026-03-27T10:30:00Z",
    updatedAt: "2026-03-27T14:00:00Z",
  },
  {
    id: "ORD-2026-002",
    userId: "U1234567890",
    service: "dry_clean",
    status: "picking_up",
    items: [
      { name: "Suit Jacket", quantity: 1, pricePerUnit: 180 },
      { name: "Dress Shirt", quantity: 2, pricePerUnit: 80 },
    ],
    address: MOCK_ADDRESSES[1],
    pickupDate: "2026-03-29",
    pickupTimeSlot: "Afternoon (13:00-15:00)",
    laundryFee: 340,
    deliveryFee: 0,
    storeId: "STORE-001",
    totalPrice: 340,
    createdAt: "2026-03-27T11:00:00Z",
    updatedAt: "2026-03-27T11:00:00Z",
  },
  {
    id: "ORD-2026-003",
    userId: "U1234567890",
    service: "wash_iron",
    status: "completed",
    items: [
      { name: "Dress Shirt", quantity: 4, pricePerUnit: 30 },
      { name: "Skirt", quantity: 2, pricePerUnit: 35 },
    ],
    address: MOCK_ADDRESSES[0],
    pickupDate: "2026-03-25",
    pickupTimeSlot: "Morning (08:00-10:00)",
    deliveryDate: "2026-03-27",
    laundryFee: 190,
    deliveryFee: 0,
    storeId: "STORE-002",
    totalPrice: 190,
    pickupDriverId: "DRIVER-03",
    createdAt: "2026-03-25T09:00:00Z",
    updatedAt: "2026-03-27T10:00:00Z",
  },
];
