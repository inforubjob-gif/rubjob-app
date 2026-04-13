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

// ─── Standard Time Slots (7:00–17:00) ───
export const TIME_SLOTS: TimeSlot[] = [
  { id: "early_morning", label: "เช้าตรู่", startTime: "07:00", endTime: "09:00" },
  { id: "morning",       label: "เช้า",     startTime: "09:00", endTime: "11:00" },
  { id: "midday",        label: "สาย",      startTime: "11:00", endTime: "13:00" },
  { id: "afternoon",     label: "บ่าย",     startTime: "13:00", endTime: "15:00" },
  { id: "late_afternoon", label: "บ่ายแก่", startTime: "15:00", endTime: "17:00" },
];
