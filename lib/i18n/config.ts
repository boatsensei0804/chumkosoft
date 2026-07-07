export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";
export const LOCALE_COOKIE = "locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
};

export function isLocale(value: string | undefined): value is Locale {
  return value === "th" || value === "en";
}
