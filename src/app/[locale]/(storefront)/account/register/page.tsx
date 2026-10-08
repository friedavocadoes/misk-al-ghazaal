"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

function RegisterForm() {
  const t = useTranslations("Account");
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState(params.get("ref") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkMail, setCheckMail] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account")}${referral.trim() ? `&ref=${encodeURIComponent(referral.trim())}` : ""}`,
      },
    });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Instant session (confirmation off): bootstrap profile now.
    if (data.session) {
      try {
        await fetch("/api/auth/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: referral.trim() || undefined }),
        });
      } catch {
        /* backfills later */
      }
      router.push("/account");
      router.refresh();
    } else {
      setBusy(false);
      setCheckMail(true);
    }
  };

  if (checkMail) {
    return <p className="border border-ink/10 bg-sand/50 p-6 text-center text-sm text-espresso">{t("checkMail")}</p>;
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Input placeholder={t("fullName")} aria-label={t("fullName")} value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder={t("email")} type="email" required aria-label={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder={t("password")} type="password" required minLength={6} aria-label={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Input
        placeholder={t("referralPh")}
        aria-label={t("referralPh")}
        value={referral}
        onChange={(e) => setReferral(e.target.value.toUpperCase())}
        className="font-mono uppercase"
      />
      <p className="-mt-1 text-[12px] leading-relaxed text-fog">{t("referralHint")}</p>
      {error && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{error}</p>}
      <Button type="submit" disabled={busy}>
        {t("create")}
      </Button>
      <p className="mt-3 text-center text-sm text-fog">
        {t("hasAccount")}{" "}
        <Link href="/account/login" className="link-underline text-ink">
          {t("login")}
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  const t = useTranslations("Account");
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="eyebrow text-center text-gold">{t("eyebrow")}</p>
      <h1 className="mt-3 text-center font-display text-4xl text-ink">{t("register")}</h1>
      <div className="mt-8">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
