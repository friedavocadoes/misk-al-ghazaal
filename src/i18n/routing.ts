import { defineRouting } from "next-intl/routing";

// Locale-prefixed routing: /en/… and /ar/…. `always` keeps both prefixed
// so URLs are predictable for the future admin/API layer.
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
