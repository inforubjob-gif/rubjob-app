import type { Service, TimeSlot } from "@/types";



// ─── Open Provinces for Registration ───
export const OPEN_PROVINCES = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  "สมุทรปราการ",
];

// ─── Business Logic Services ───
// These are used for UI labels and icons, NOT as mock data.
export const SERVICES: Service[] = [
  {
    id: "wash_fold",
    name: "Wash & Dry",
    category: "laundry",
    description: "Everyday laundry, washed and dried",
    basePrice: 129,
    unit: "piece",
    icon: "wash_fold",
    estimatedDays: 2,
  },
  {
    id: "duvet_washing",
    name: "Duvet Washing",
    category: "laundry",
    description: "Deep clean for duvets and blankets",
    basePrice: 199,
    unit: "piece",
    icon: "duvet_washing",
    estimatedDays: 2,
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

// ─── Standard Time Slots ───
export const TIME_SLOTS: TimeSlot[] = [
  { id: "morning", label: "09:00 - 12:00", startTime: "09:00", endTime: "12:00" },
  { id: "afternoon", label: "14:00 - 17:00", startTime: "14:00", endTime: "17:00" },
];
