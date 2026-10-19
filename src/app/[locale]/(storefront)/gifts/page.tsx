import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/lib/i18n";
export const metadata = { title: "Gifts — Misk Al Ghazaal" };
export default async function Gifts({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale); setRequestLocale(locale); const ar = locale === "ar";
  return <section className="flex min-h-[65svh] flex-col items-center justify-center bg-[#f4f0e9] px-6 py-24 text-center"><span className="mb-8 text-xs uppercase tracking-[.3em] text-gold">{ar ? "فن الإهداء" : "The art of giving"}</span><h1 className="text-5xl font-light md:text-7xl">{ar ? "قريباً" : "Coming soon"}</h1><p className="mt-6 max-w-sm text-sm leading-7 text-fog">{ar ? "هدايا تستحق الانتظار." : "Something worth giving. Something worth waiting for."}</p><Link href="/collection/all" className="mt-10 border-b border-ink/40 pb-2 text-xs uppercase tracking-widest">{ar ? "اكتشف العطور" : "Explore the fragrances"}</Link></section>;
}
