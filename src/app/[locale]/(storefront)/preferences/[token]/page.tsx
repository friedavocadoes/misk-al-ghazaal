import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCommunicationPreferences } from "@/lib/leads";
import { CommunicationPreferences } from "@/components/account/CommunicationPreferences";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Communication preferences",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export default async function PreferencesPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const prefs = await getCommunicationPreferences(token);
  if (!prefs) notFound();
  return (
    <div className="bg-cream px-5 py-14 md:py-24">
      <CommunicationPreferences token={token} {...prefs} ar={locale === "ar"} />
    </div>
  );
}
