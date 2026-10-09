"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PasswordForm } from "@/components/blocks/PasswordForm";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

/** Reset-link landing: the email link carries ?code= (rescued by proxy
    into a session), then the shopper chooses the new password here. */
export default function ResetPage() {
  const t = useTranslations("Account");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    createBrowserClient()
      .auth.getUser()
      .then(({ data }) => setReady(!!data.user))
      .catch(() => setReady(false));
  }, []);

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:px-8">
      <p className="eyebrow text-gold">{t("settings")}</p>
      <h1 className="mt-2 font-display text-4xl text-ink">{t("resetTitle")}</h1>
      <div className="mt-6 border border-ink/10 bg-white p-6">
        {!ready ? (
          <p className="animate-pulse text-sm text-fog">{t("checking")}</p>
        ) : (
          <PasswordForm cta={t("passwordSave")} />
        )}
      </div>
      <Link href="/account/login" className="link-underline mt-6 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
        {t("login")}
      </Link>
    </div>
  );
}
