import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

// Phase 1 stub — no auth logic. Supabase Auth lands in Phase 2.
export default async function AccountPage(props: PageProps<"/[locale]/account">) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-3 font-display text-4xl text-ink">{t("title")}</h1>
      <p className="mt-3 text-sm text-espresso">{t("text")}</p>
      <div className="mt-8 flex gap-2">
        <Button asChild className="flex-1">
          <Link href="/account/login">{t("login")}</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/account/register">{t("register")}</Link>
        </Button>
      </div>
    </div>
  );
}
