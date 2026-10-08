"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

function GoogleGlyph() {
  return <span aria-hidden className="font-display text-base font-bold italic">G</span>;
}

function LoginForm() {
  const t = useTranslations("Account");
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const afterAuth = async (ref?: string) => {
    try {
      await fetch("/api/auth/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref }),
      });
    } catch {
      /* profile backfills on next visit */
    }
    router.push(next);
    router.refresh();
  };

  const emailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    await afterAuth();
  };

  const googleLogin = async () => {
    setBusy(true);
    setError("");
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setBusy(false);
      setError(error.message);
    }
  };

  return (
    <>
      <Button variant="outline" className="w-full" onClick={googleLogin} disabled={busy}>
        <GoogleGlyph /> {t("google")}
      </Button>
      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-fog">
        <span className="h-px flex-1 bg-ink/10" />
        {t("or")}
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <form onSubmit={emailLogin} className="grid gap-3">
        <Input placeholder={t("email")} type="email" required aria-label={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder={t("password")} type="password" required aria-label={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{error}</p>}
        <Button type="submit" disabled={busy}>
          {t("signIn")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-fog">
        {t("noAccount")}{" "}
        <Link href="/account/register" className="link-underline text-ink">
          {t("register")}
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  const t = useTranslations("Account");
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="eyebrow text-center text-gold">{t("eyebrow")}</p>
      <h1 className="mt-3 text-center font-display text-4xl text-ink">{t("login")}</h1>
      <div className="mt-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
