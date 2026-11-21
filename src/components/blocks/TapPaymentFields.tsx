"use client";

import Script from "next/script";
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from "react";
import { tapPhone } from "@/lib/checkout-payment";

export type TapBrowserConfig = { publicKey: string; merchantId: string };
export type TapCardHandle = { tokenize: () => Promise<string> };
export type TapFieldStatus = "loading" | "ready" | "invalid" | "unavailable";
type SDK = {
  renderTapCard: (id: string, options: Record<string, unknown>) => { unmount: () => void };
  tokenize: () => void;
};
type AppleSDK = { render: (options: Record<string, unknown>, id: string) => void; abortApplePaySession: () => void };
declare global {
  interface Window { CardSDK?: SDK; TapApplepaySDK?: AppleSDK }
}

export function TapPaymentFields({ config, method, total, locale, name, email, phone, ref, onAppleToken, onStatus, disabled }: {
  config: TapBrowserConfig; method: "card" | "apple_pay"; total: number; locale: "en" | "ar";
  name: string; email: string; phone: string; ref: Ref<TapCardHandle>;
  onAppleToken: (token: string) => Promise<void>; disabled: boolean;
  onStatus: (status: TapFieldStatus) => void;
}) {
  const id = `tap-${useId().replace(/:/g, "")}`;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const pending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null>(null);
  const onToken = useRef(onAppleToken);
  const report = useRef(onStatus);
  const ar = locale === "ar";
  useEffect(() => { onToken.current = onAppleToken; }, [onAppleToken]);
  useEffect(() => { report.current = onStatus; }, [onStatus]);
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => { setError(true); report.current("unavailable"); }, 15000);
    return () => clearTimeout(timer);
  }, [loaded]);

  useImperativeHandle(ref, () => ({ tokenize: () => new Promise<string>((resolve, reject) => {
    if (!ready || !window.CardSDK || method !== "card" || pending.current) {
      reject(new Error("Payment fields are unavailable"));
      return;
    }
    const timer = setTimeout(() => {
      pending.current = null;
      reject(new Error("Please check your card details and try again"));
    }, 15000);
    pending.current = { resolve, reject, timer };
    try { window.CardSDK.tokenize(); } catch {
      clearTimeout(timer); pending.current = null; reject(new Error("Payment fields are unavailable"));
    }
  }) }), [ready, method]);

  useEffect(() => {
    if (!loaded) return;
    let active = true;
    let initialized = false;
    let unmount: (() => void) | undefined;
    const watchdog = setTimeout(() => {
      if (active) { setError(true); report.current("unavailable"); }
    }, 15000);
    const fail = () => {
      if (!active) return;
      clearTimeout(watchdog);
      setError(true);
      report.current(initialized ? (method === "apple_pay" ? "ready" : "invalid") : "unavailable");
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.reject(new Error("Please check your payment details and try again"));
        pending.current = null;
      }
    };
    const success = async (data: unknown) => {
      if (!active) return;
      const token = (data as { id?: unknown })?.id;
      if (typeof token !== "string" || !/^tok_[a-zA-Z0-9_-]{1,150}$/.test(token)) { fail(); return; }
      setError(false);
      if (method === "apple_pay") {
        try { await onToken.current(token); } catch { fail(); }
      }
      else if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.resolve(token);
        pending.current = null;
      }
    };
    const [first, ...rest] = name.trim().split(/\s+/);
    const number = tapPhone(phone);
    const customer = {
      name: [{ lang: locale, locale, first, last: rest.join(" ") }],
      nameOnCard: name, editable: true,
      contact: { email: email || undefined, phone: number ? { countryCode: number.country_code, number: number.number } : undefined },
    };
    const init = setTimeout(() => {
      if (!active) return;
      setError(false); setReady(false); report.current("loading");
      try {
        if (method === "card") {
          const sdk = window.CardSDK;
          if (!sdk) { fail(); return; }
          unmount = sdk.renderTapCard(id, {
            publicKey: config.publicKey, merchant: { id: config.merchantId },
            transaction: { amount: total, currency: "AED" }, customer,
            acceptance: { supportedCards: "ALL", supportedBrands: ["VISA", "MASTERCARD", "AMERICAN_EXPRESS"] },
            fields: { cardHolder: true }, addons: { loader: true, saveCard: false, displayPaymentBrands: true },
            interface: { locale, theme: "light", edges: "straight", direction: ar ? "rtl" : "ltr" },
            onReady: () => { if (active) { initialized = true; clearTimeout(watchdog); setReady(true); report.current("invalid"); } },
            onValidInput: () => { if (active) { setError(false); report.current("ready"); } },
            onInvalidInput: () => { if (active) report.current("invalid"); },
            onError: fail, onSuccess: success,
          }).unmount;
        } else {
          if (!window.TapApplepaySDK) { fail(); return; }
          window.TapApplepaySDK.render({
            debug: false, scope: "TapToken", environment: "production", publicKey: config.publicKey,
            merchant: { id: config.merchantId, domain: window.location.hostname },
            acceptance: { supportedBrands: ["visa", "masterCard", "amex"] },
            features: { supportsCouponCode: false }, customer,
            transaction: { amount: total.toFixed(2), currency: "AED" },
            interface: { locale, theme: "light", type: "pay", edges: "curved" },
            onReady: () => { if (active) { initialized = true; clearTimeout(watchdog); setReady(true); report.current("ready"); } },
            onCancel: () => { if (active && initialized) { setError(false); report.current("ready"); } },
            onError: fail, onSuccess: success,
          }, id);
        }
      } catch { fail(); }
    }, 0);
    return () => {
      active = false; clearTimeout(init); clearTimeout(watchdog);
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.reject(new Error("Payment details changed"));
        pending.current = null;
      }
      try {
        unmount?.();
        if (method === "apple_pay") window.TapApplepaySDK?.abortApplePaySession();
      } catch { /* The SDK may already have closed its frame or wallet session. */ }
    };
  }, [loaded, config.publicKey, config.merchantId, method, total, locale, ar, name, email, phone, id]);

  return <div className="border border-ink/10 bg-white p-5" aria-busy={!ready && !error}>
    <Script src={method === "card" ? "https://tap-sdks.b-cdn.net/card/1.0.2/index.js" : "https://tap-sdks.b-cdn.net/apple-pay/build-1.2.0/main.js"}
      onReady={() => setLoaded(true)} onError={() => { setError(true); report.current("unavailable"); }} />
    {method === "apple_pay" && <link rel="stylesheet" href="https://tap-sdks.b-cdn.net/apple-pay/build-1.2.0/main.css" />}
    <div inert={disabled} id={id} className="min-h-16" />
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{ready
      ? (ar ? "تحقق من بيانات الدفع وأعد المحاولة." : "Check your payment details and try again.")
      : (ar ? "تعذر تحميل حقول الدفع الآمن. يمكنك المتابعة على صفحة Tap الآمنة." : "The secure payment fields couldn’t load. You can continue on Tap’s secure payment page.")}</p>}
    {!ready && !error && <p role="status" className="text-xs text-fog">{ar ? "جارٍ تحميل الدفع الآمن…" : "Loading secure payment…"}</p>}
  </div>;
}
