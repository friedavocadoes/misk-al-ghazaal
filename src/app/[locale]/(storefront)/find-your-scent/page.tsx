import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getNotes, getProducts } from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { ScentJourney } from "@/components/sections/ScentJourney";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "ar" ? "اكتشف عطرك — مسك الغزال" : "Find Your Scent — Misk Al Ghazaal", description: "Discover a fragrance through the notes you love. A personal scent journey by Misk Al Ghazaal." };
}
export default async function ScentPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale); setRequestLocale(locale);
  const [notes, products] = await Promise.all([getNotes(), getProducts()]);
  return <ScentJourney notes={notes} products={products} />;
}
