"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Ticket, X } from "lucide-react";
import type { Coupon } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { celebrate } from "@/lib/confetti";
import { CouponInfo, couponBlurb } from "./CouponTicket";

const LS_KEY = "misk-coupon";

function readStoredCoupon(): string {
  try {
    return localStorage.getItem(LS_KEY)?.trim().toUpperCase() ?? "";
  } catch {
    return "";
  }
}

/** Buy-box offers: public coupons with tap-to-apply + live savings
    preview (priced by /api/quote, so the number is always exact).
    Applied codes ride to checkout via localStorage. */
export function PdpOffers({
  price,
  coupons,
  locale,
}: {
  slug: string;
  price: number;
  coupons: Coupon[];
  locale: Locale;
}) {
  const t = useTranslations("Product");
  // Checkout handoff: explicit session action wins, otherwise mirror the
  // stored code (cross-tab synced, SSR-safe via server snapshot).
  const stored = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      return () => window.removeEventListener("storage", onChange);
    },
    readStoredCoupon,
    () => "",
  );
  const [session, setSession] = useState<string | null>(null);
  const applied = session ?? stored;
  const coupon = coupons.find(c => c.code === applied);
  const saving = coupon && price >= coupon.minSubtotal ? Math.min(price,coupon.maxDiscount ?? Infinity,coupon.kind === "percent" ? Math.round(price*coupon.amount/100) : coupon.kind === "fixed" ? coupon.amount : 0) : null;
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  if (!coupons.length) return null;

  const apply = async (code: string, el?: HTMLElement | null) => {
    setBusy(code);
    setError("");
    try {
      const coupon=coupons.find(c=>c.code===code);
      if(!coupon || price < coupon.minSubtotal) { setError(t("offerMin")); return; }
      {
        setSession(code);

        try {
          localStorage.setItem(LS_KEY, code);
        } catch {
          /* ignore */
        }
        celebrate(el ?? undefined);
      }
    } catch {
      setError(t("offerBad"));
      setShakeKey((k) => k + 1);
    } finally {
      setBusy("");
    }
  };

  const remove = () => {
    setSession("");

    setError("");
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-4 border border-gold/40 bg-gold-wash/40 p-4">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
        <Ticket className="size-3.5" /> {locale === "ar" ? "اكتشف توفيرك" : "Preview your savings"}
      </p>
      <ul className="mt-3 space-y-2">
        {coupons.slice(0, 3).map((c) => {
          const isApplied = applied === c.code;
          const isBusy = busy === c.code;
          return (
            <li
              key={c.id}
              className="flex items-center gap-2 border border-dashed border-gold/60 bg-cream px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-[13px] font-bold tracking-[0.1em] text-ink">
                    {c.code}
                  </span>
                  <CouponInfo coupon={c} locale={locale} />
                </span>
                <span className="block truncate text-[11px] text-espresso">
                  {couponBlurb(c, locale, t)}
                </span>
              </span>
              {isApplied ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1e7a46]">
                    <Check className="size-3.5" />
                    {saving != null ? `−${saving.toFixed(0)}` : t("appliedLabel")}
                  </span>
                  <button
                    type="button"
                    onClick={remove}
                    aria-label={t("removeOffer")}
                    className="cursor-pointer p-1 text-fog transition hover:text-[#9c2b2e]"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={(e) => void apply(c.code, e.currentTarget)}
                  className="shrink-0 cursor-pointer border border-ink bg-ink px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-gold-soft hover:text-ink disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : (locale === "ar" ? "عرض التوفير" : "See savings")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {applied && <p className="mt-3 text-xs text-espresso">{locale === "ar" ? "سجّل الدخول لاسترداد العرض عند الدفع. يخضع للشروط." : "Savings preview. Sign in to redeem at checkout; eligibility and terms apply."}</p>}
      {error && (
        <p key={shakeKey} className="coupon-shake mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9c2b2e]">
          {error}
        </p>
      )}
    </div>
  );
}
