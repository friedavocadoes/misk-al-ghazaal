"use client";

import { useSyncExternalStore } from "react";
import { ANALYTICS_COOKIES, PRIVACY_COOKIE, privacyChoice } from "./consent";

const CHANGE = "misk-privacy-change";

export function browserPrivacyChoice() {
  return privacyChoice(document.cookie.split("; ").find(cookie => cookie.startsWith(PRIVACY_COOKIE + "="))?.split("=")[1]);
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("pageshow", callback);
  return () => {
    window.removeEventListener(CHANGE, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("pageshow", callback);
  };
}

export function usePrivacyChoice() {
  return useSyncExternalStore(subscribe, browserPrivacyChoice, () => null);
}

export function savePrivacyChoice(choice: "allow" | "essential") {
  const attributes = `Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  document.cookie = `${PRIVACY_COOKIE}=${choice}; Max-Age=15552000; ${attributes}`;
  if (choice === "essential") {
    for (const name of ANALYTICS_COOKIES) document.cookie = `${name}=; Max-Age=0; ${attributes}`;
    try {
      localStorage.removeItem("misk-survey-bag");
      localStorage.removeItem("misk-survey-history");
      for (const key of Object.keys(sessionStorage)) {
        if (/^analytics-(survey|purchased):/.test(key)) sessionStorage.removeItem(key);
      }
    } catch { /* Storage can be blocked by the browser. */ }
  }
  try { localStorage.setItem(CHANGE, String(Date.now())); } catch {}
  window.dispatchEvent(new Event(CHANGE));
  return browserPrivacyChoice() === choice;
}
