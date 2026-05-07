import { th } from "./locales/th";
import { en } from "./locales/en";

export type Language = "th" | "en";

// Unified i18n object importing from dedicated locale files
export const RUBJOB_I18N: any = {
  th,
  en
};
