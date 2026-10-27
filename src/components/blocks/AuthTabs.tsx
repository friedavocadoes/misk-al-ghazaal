"use client";
import { haptic } from "@/lib/haptics";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleGlyph } from "@/components/ui/brand-icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

function GoogleButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  const t = useTranslations("Account");
  return (
    <>
      <Button variant="outline" className="w-full cursor-pointer" onClick={onClick} disabled={busy}>
        <GoogleGlyph className="size-[18px]" /> {t("google")}
      </Button>
      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-fog">
        <span className="h-px flex-1 bg-ink/10" />
        {t("or")}
        <span className="h-px flex-1 bg-ink/10" />
      </div>
    </>
  );
}

function LoginPane({ next }: { next: string }) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promo, setPromo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const afterAuth = async () => {
    try {
      await fetch("/api/auth/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoOptIn: promo }),
      });
    } catch {
      /* profile backfills on next visit */
    }
    router.push(next);
    router.refresh();
  };

  const emailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const { error } = await createBrowserClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      haptic("error");
      setError(error.message);
      return;
    }
    haptic("success");
    await afterAuth();
  };

  const googleLogin = async () => {
    haptic("selection");
    if (busy) return;
    setBusy(true);
    setError("");
    const { error } = await createBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setBusy(false);
      haptic("error");
      setError(error.message);
    }
  };

  return (
    <>
      <GoogleButton onClick={googleLogin} busy={busy} />
      <form onSubmit={emailLogin} className="grid gap-3">
        <Input placeholder={t("email")} type="email" required aria-label={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder={t("password")} type="password" required aria-label={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end">
          <Link href="/account/forgot" className="text-[12px] font-semibold uppercase tracking-[0.14em] text-fog transition hover:text-gold">
            {t("forgot")}
          </Link>
        </div>
        {error && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{error}</p>}
        <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-fog">
          <input
            type="checkbox"
            checked={promo}
            onChange={(e) => setPromo(e.target.checked)}
            className="mt-0.5 size-3 shrink-0 cursor-pointer accent-[#8a6d2f]"
          />
          <span>{t("promoOpt")}</span>
        </label>
        <Button type="submit" disabled={busy}>
          {t("signIn")}
        </Button>
      </form>
    </>
  );
}

function RegisterPane({ next, initialRef }: { next: string; initialRef: string }) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState(initialRef);
  const [promo, setPromo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkMail, setCheckMail] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const ref = referral.trim();
    const { data, error } = await createBrowserClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`,
      },
    });
    if (error) {
      setBusy(false);
      haptic("error");
      setError(error.message);
      return;
    }
    haptic("success");
    if (data.session) {
      try {
        await fetch("/api/auth/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: ref || undefined, promoOptIn: promo }),
        });
      } catch {
        /* backfills later */
      }
      router.push(next);
      router.refresh();
    } else {
      setBusy(false);
      setCheckMail(true);
    }
  };

  const googleSignup = async () => {
    haptic("selection");
    if (busy) return;
    setBusy(true);
    setError("");
    const ref = referral.trim();
    const { error } = await createBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`,
      },
    });
    if (error) {
      setBusy(false);
      haptic("error");
      setError(error.message);
    }
  };

  if (checkMail) {
    return <p className="border border-ink/10 bg-sand/50 p-6 text-center text-sm text-espresso">{t("checkMail")}</p>;
  }

  return (
    <>
      <GoogleButton onClick={googleSignup} busy={busy} />
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
        <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-fog">
          <input
            type="checkbox"
            checked={promo}
            onChange={(e) => setPromo(e.target.checked)}
            className="mt-0.5 size-3 shrink-0 cursor-pointer accent-[#8a6d2f]"
          />
          <span>{t("promoOpt")}</span>
        </label>
        <Button type="submit" disabled={busy}>
          {t("create")}
        </Button>
      </form>
    </>
  );
}

/** One-step auth: login + register as tabs on a single card. */
export function AuthTabs({ defaultTab }: { defaultTab: "login" | "register" }) {
  const t = useTranslations("Account");
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/account";
  // Internal paths only — never bounce shoppers to an external URL.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
  const ref = params.get("ref") ?? "";
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="login">{t("login")}</TabsTrigger>
        <TabsTrigger value="register">{t("register")}</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <LoginPane next={next} />
      </TabsContent>
      <TabsContent value="register">
        <RegisterPane next={next} initialRef={ref} />
      </TabsContent>
    </Tabs>
  );
}
