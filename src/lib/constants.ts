import type { Service, TimeSlot } from "@/types";

// ─── Business Logic Services ───
// These are used for UI labels and icons, NOT as mock data.
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

// ─── Direct Service Categories (Provider/Specialist — NOT shown in main app) ───
export const DIRECT_SERVICES: Service[] = [
  {
    id: "gecko_catcher",
    name: "Gecko Catcher",
    category: "specialist",
    description: "Professional gecko & pest removal from your home",
    basePrice: 300,
    unit: "session",
    icon: "gecko_catcher",
    estimatedDays: 0,
  },
  {
    id: "fortune_telling",
    name: "Fortune Telling",
    category: "specialist",
    description: "Horoscope reading, tarot, and life guidance sessions",
    basePrice: 500,
    unit: "session",
    icon: "fortune_telling",
    estimatedDays: 0,
  },
  {
    id: "life_management",
    name: "Life Management",
    category: "specialist",
    description: "Errands, scheduling, admin tasks — your personal organizer",
    basePrice: 400,
    unit: "hour",
    icon: "life_management",
    estimatedDays: 0,
  },
  {
    id: "companion_friend",
    name: "Companion Friend",
    category: "specialist",
    description: "A friendly companion for lonely times, meals, or outings",
    basePrice: 250,
    unit: "hour",
    icon: "companion_friend",
    estimatedDays: 0,
  },
];

/** All available skill IDs for Provider registration */
export const PROVIDER_SKILL_OPTIONS = DIRECT_SERVICES.map(s => ({ id: s.id, name: s.name, icon: s.icon, unit: s.unit, suggestedPrice: s.basePrice }));

// ─── Standard Time Slots (09:00–17:00) ───
export const TIME_SLOTS: TimeSlot[] = [
  { id: "h09_10", label: "09:00 - 10:00", startTime: "09:00", endTime: "10:00" },
  { id: "h10_11", label: "10:00 - 11:00", startTime: "10:00", endTime: "11:00" },
  { id: "h11_12", label: "11:00 - 12:00", startTime: "11:00", endTime: "12:00" },
  { id: "h12_13", label: "12:00 - 13:00", startTime: "12:00", endTime: "13:00" },
  { id: "h13_14", label: "13:00 - 14:00", startTime: "13:00", endTime: "14:00" },
  { id: "h14_15", label: "14:00 - 15:00", startTime: "14:00", endTime: "15:00" },
  { id: "h15_16", label: "15:00 - 16:00", startTime: "15:00", endTime: "16:00" },
  { id: "h16_17", label: "16:00 - 17:00", startTime: "16:00", endTime: "17:00" },
];
