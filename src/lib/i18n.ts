import { th } from "./locales/th";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

export type Language = "th" | "en" | "zh";

// Unified i18n object importing from dedicated locale files
export const RUBJOB_I18N: any = {
  th,
  en,
  zh
};
