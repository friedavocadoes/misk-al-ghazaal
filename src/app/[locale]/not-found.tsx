import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toLocale } from "@/lib/i18n";

export default async function LocaleNotFound() {
  const locale = toLocale(await getLocale().catch(() => "en"));
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "NotFound" });
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <p className="mt-3 font-display text-7xl text-ink">404</p>
      <h1 className="mt-4 font-display text-2xl text-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-espresso">{t("text")}</p>
      <div className="mt-8 flex justify-center gap-2">
        <Button asChild>
          <Link href="/">{t("home")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/collection/best-sellers">{t("best")}</Link>
        </Button>
      </div>
    </div>
  );
}
