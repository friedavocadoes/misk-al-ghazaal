import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { PasswordForm } from "@/components/blocks/PasswordForm";
import { displayName, providerOf } from "@/lib/shopper-identity";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";

/** Logged-in password change (email accounts only — Google identities
    have no maison password to change). */
export default async function PasswordPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });

  const session = await requireShopper();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <Link href="/account/login" className="link-underline text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("login")}
        </Link>
      </div>
    );
  }
  if (providerOf(session.user) !== "email") {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-sm text-espresso">
          {t("loggedInWith")} {t("providerGoogle")} — {t("passwordTitle")} N/A.
        </p>
        <Link href="/account" className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("backToAccount")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:px-8">
      <Link href="/account" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-fog transition hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("backToAccount")}
      </Link>
      <p className="eyebrow mt-4 text-gold">{t("settings")}</p>
      <h1 className="mt-2 font-display text-4xl text-ink">
        {t("passwordTitle")} · {displayName(session.user)}
      </h1>
      <div className="mt-8 border border-ink/10 bg-white p-6">
        <PasswordForm />
      </div>
    </div>
  );
}
