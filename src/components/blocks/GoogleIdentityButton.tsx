"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type GoogleIdentity = {
  initialize(options: {
    client_id: string;
    nonce: string;
    ux_mode: "redirect";
    login_uri: string;
  }): void;
  renderButton(element: HTMLElement, options: {
    theme: "outline";
    size: "large";
    text: "continue_with";
    locale: string;
    width: number;
    shape: "rectangular";
    type: "standard";
    state: string;
  }): void;
};

export function GoogleIdentityButton({ clientId, next, referral }: {
  clientId: string;
  next: string;
  referral?: string;
}) {
  const t = useTranslations("Account");
  const locale = useLocale() === "ar" ? "ar" : "en";
  const target = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const context = JSON.stringify({ next, ref: referral, locale });
  const [attempt, setAttempt] = useState<{ nonce: string; state: string; context: string } | null>(null);

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.min(400, Math.floor(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { void fetch("/auth/google/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: context,
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Google sign-in setup");
      const attempt = await response.json();
      if (!controller.signal.aborted) {
        setFailed(false);
        setAttempt({ ...attempt, context });
      }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [context]);

  useEffect(() => {
    const element = target.current;
    const identity = (window as Window & { google?: { accounts: { id: GoogleIdentity } } }).google?.accounts.id;
    if (!ready || !element || !identity || !attempt || attempt.context !== context) return;
    identity.initialize({
      client_id: clientId,
      nonce: attempt.nonce,
      ux_mode: "redirect",
      login_uri: window.location.origin + "/auth/google",
    });
    identity.renderButton(element, {
      theme: "outline", size: "large", text: "continue_with", locale,
      width, shape: "rectangular", type: "standard", state: attempt.state,
    });
    return () => element.replaceChildren();
  }, [attempt, clientId, context, locale, ready, width]);

  return (
    <>
      <Script key={locale} src={`https://accounts.google.com/gsi/client?hl=${locale}`} onReady={() => setReady(true)} onError={() => setFailed(true)} />
      <div ref={target} dir={locale === "ar" ? "rtl" : "ltr"} className="flex min-h-11 w-full justify-center" />
      {failed && <p role="alert" className="mt-2 text-center text-xs text-red-800">{t("googleUnavailable")}</p>}
    </>
  );
}
