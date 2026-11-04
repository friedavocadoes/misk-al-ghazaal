"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type GoogleIdentity = {
  initialize(options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(element: HTMLElement, options: {
    theme: "outline";
    size: "large";
    text: "continue_with";
    locale: string;
  }): void;
};

export function GoogleIdentityButton({ clientId, onSignIn }: {
  clientId: string;
  onSignIn: () => Promise<void>;
}) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const target = useRef<HTMLDivElement>(null);
  const complete = useRef(onSignIn);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { complete.current = onSignIn; }, [onSignIn]);

  useEffect(() => {
    const element = target.current;
    const identity = (window as Window & { google?: { accounts: { id: GoogleIdentity } } }).google?.accounts.id;
    if (!ready || !element || !identity) return;
    let active = true;
    let used = false;

    async function renderButton() {
      const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
      if (!active || !identity || !element) return;
      const hashedNonce = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      identity.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        callback: async ({ credential }) => {
          if (!active || used || !credential) return;
          used = true;
          element.replaceChildren();
          setFailed(false);
          try {
            const { error } = await createClient().auth.signInWithIdToken({ provider: "google", token: credential, nonce });
            if (error) throw error;
            await complete.current();
          } catch {
            if (active) {
              setFailed(true);
              setAttempt(value => value + 1);
            }
          }
        },
      });
      identity.renderButton(element, { theme: "outline", size: "large", text: "continue_with", locale });
    }

    void renderButton().catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      element.replaceChildren();
    };
  }, [attempt, clientId, locale, ready]);

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" onReady={() => setReady(true)} onError={() => setFailed(true)} />
      <div ref={target} className="flex justify-center" />
      {failed && <p role="alert" className="mt-2 text-center text-xs text-red-800">{t("googleUnavailable")}</p>}
    </>
  );
}
