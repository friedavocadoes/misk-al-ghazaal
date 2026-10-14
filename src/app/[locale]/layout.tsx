import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "swiper/css";
import "swiper/css/effect-creative";
import "leaflet/dist/leaflet.css";
import "../globals.css";

const body = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Arabic-script companion (Playfair/Inter carry no Arabic glyphs).
const arabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  display: "swap",
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Misk Al Ghazaal — Perfumes, Dukhoon & Bakhoor",
  description:
    "Authentic Misk Al Ghazaal perfumes, dukhoon and bakhoor — direct from manufacturer, delivered across the UAE.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout(
  props: LayoutProps<"/[locale]">
) {
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch {
    messages = (await import("@/messages/en.json")).default;
  }

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${body.variable} ${display.variable} ${arabic.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-cream font-[family-name:var(--font-body)] text-ink">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {props.children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
