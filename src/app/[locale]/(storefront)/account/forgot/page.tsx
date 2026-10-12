"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

/** Logged-out reset request: Supabase emails the link (works on the
    default mailer; custom SMTP raises the limits — see SETUP notes). */
export default function ForgotPage() {
  const t = useTranslations("Account");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const { error } = await createBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/account/reset`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-12 md:px-8">
      <Link href="/account/login" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-fog transition hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("login")}
      </Link>
      <p className="eyebrow mt-4 text-gold">{t("settings")}</p>
      <h1 className="mt-2 font-display text-4xl text-ink">{t("forgotTitle")}</h1>
      {sent ? (
        <p className="mt-6 border border-[#1e7a46]/40 bg-[#1e7a46]/[0.07] p-6 text-center text-sm text-ink">
          {t("resetSent")}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 grid gap-3">
          <p className="text-sm text-espresso">{t("forgotText")}</p>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            aria-label={t("email")}
            dir="ltr"
          />
          {error && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{error}</p>}
          <Button type="submit" disabled={busy}>
            {t("sendReset")}
          </Button>
        </form>
      )}
    </div>
  );
}
