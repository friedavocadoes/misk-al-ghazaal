import type { Locale } from "@/i18n/routing";

// ---------------------------------------------------------------------------
// Localizable content contract — THE pattern the future admin panel plugs
// into. Any content field that may one day have an Arabic version is shaped
// { en: T; ar?: T }. The storefront NEVER branches on locale for content;
// it calls pick(). Library/static UI strings (buttons, labels) live in
// src/messages/{en,ar}.json via next-intl instead — do not duplicate them
// here. When the admin panel lands, it writes the `ar` side; until then
// everything falls back to English with zero code changes.
// ---------------------------------------------------------------------------

export interface Localizable<T> {
  en: T;
  ar?: T;
}

export function pick<T>(entry: Localizable<T>, locale: Locale): T {
  return locale === "ar" && entry.ar !== undefined ? entry.ar : entry.en;
}

/** Shorthand for name/title pairs: Arabic when present, else English.
 *  Product/collection names are transliterations (same name, Arabic
 *  script) — never meaning-translations. */
export function tx(en: string, ar: string | undefined, locale: Locale): string {
  return locale === "ar" && ar ? ar : en;
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

/** Coerce a route param into a Locale. Middleware + the [locale] layout
 *  already guarantee validity; this satisfies TypeScript at call sites. */
export function toLocale(value: string): Locale {
  return value === "ar" ? "ar" : "en";
}
