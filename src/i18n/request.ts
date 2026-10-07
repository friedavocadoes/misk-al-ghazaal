import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

// Central next-intl config (loaded via the plugin in next.config.ts).
// Falls back to English messages — mirrors the pick() fallback contract:
// Arabic shows wherever an `ar` entry exists, English everywhere else.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
