"use client";

import { couponSavings, money } from "@/lib/coupon-savings";
import {createClient} from "@/lib/supabase/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Check, Loader2, Sparkles, X } from "lucide-react";
import type { Coupon } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { celebrate } from "@/lib/confetti";
import { CouponTicket } from "./CouponTicket";

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
  quantity=1,
  coupons: initialCoupons,
  locale,
}: {
  slug: string;
  price: number;
  quantity?: number;
  coupons: Coupon[];
  locale: Locale;
}) {
  const [coupons,setCoupons]=useState(initialCoupons.filter(c => !c.firstOrderOnly));
  useEffect(()=>{let version=0;const refresh=()=>{const v=++version;fetch("/api/coupons",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(v===version)setCoupons(d.coupons||[]);}).catch(()=>setCoupons([]));};refresh();const {data:{subscription}}=createClient().auth.onAuthStateChange(()=>refresh());return()=>{version++;subscription.unsubscribe();};},[]);
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
  const saving = coupon && price >= coupon.minSubtotal ? couponSavings(price,coupon) : null;
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
    <div className="pdp-offers mt-5">
      <p className="offer-heading">
        <Sparkles className="size-3.5" /> {locale === "ar" ? "هدية صغيرة لك" : "A little extra, for you"}
      </p>
      <ul className="mt-3 space-y-2">
        {coupons.slice(0, 3).map((c) => {
          const isApplied = applied === c.code;
          const isBusy = busy === c.code;
          return (
            <li key={c.id}>
              <CouponTicket coupon={c} locale={locale} selected={isApplied} subtotal={price} action={
              isApplied ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1e7a46]">
                    <Check className="size-3.5" />
                    {saving != null ? `−${saving.toFixed(2)}` : t("appliedLabel")}
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
                  disabled={!!busy || price<c.minSubtotal}
                  onClick={(e) => void apply(c.code, e.currentTarget)}
                  className="offer-reveal"
                >
                  {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : <><span>{locale === "ar" ? "اكتشف" : "Reveal"}</span><ArrowUpRight size={15} /></>}
                </button>
              )}
              />
            </li>
          );
        })}
      </ul>
      {coupon && saving != null && saving > 0 && <div className="offer-result" role="status"><span>{locale === "ar" ? "السعر المتوقع مع العرض" : quantity>1 ? `Your total for ${quantity} with this offer` : "Your price with this offer"}</span><strong>AED {money(price - saving).toFixed(2)}</strong></div>}
      {applied && <p className="mt-3 text-xs text-espresso">{locale === "ar" ? "سجّل الدخول لاسترداد العرض عند الدفع. يخضع للشروط." : "Savings preview. Sign in to redeem at checkout; eligibility and terms apply."}</p>}
      {error && (
        <p key={shakeKey} className="coupon-shake mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9c2b2e]">
          {error}
        </p>
      )}
    </div>
  );
}
