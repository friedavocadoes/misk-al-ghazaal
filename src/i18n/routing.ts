import { defineRouting } from "next-intl/routing";

// Prefix-when-needed routing: default locale (en) lives at clean `/…`
// URLs (no 302 chain — better SEO, OAuth-friendly), Arabic at `/ar/…`.
// Language choice persists via the NEXT_LOCALE cookie (set automatically
// by the locale-aware router). ALWAYS import Link/redirect/useRouter/
// usePathname from @/i18n/navigation with UNPREFIXED hrefs.
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
