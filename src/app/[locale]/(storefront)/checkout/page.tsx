"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAED } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartMeta } from "@/lib/cart-meta";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/routing";
import type { Quote } from "@/lib/types";

const inputCls =
  "w-full rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-gold focus:outline-none";

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const { lines, clear } = useCart();
  const { meta } = useCartMeta(lines.map((l) => l.productSlug));

  const [userId, setUserId] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dubai");
  const [emirate, setEmirate] = useState("Dubai");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponState, setCouponState] = useState<"idle" | "ok" | "bad">("idle");
  const [referral, setReferral] = useState("");
  const [appliedReferral, setAppliedReferral] = useState("");
  const [referralState, setReferralState] = useState<"idle" | "ok" | "bad">("idle");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [done, setDone] = useState<{ orderNo: string; total: number } | null>(null);

  useEffect(() => {
    createBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) {
          setUserId(data.user.id);
          if (data.user.email) setEmail((e) => e || data.user.email!);
        } else {
          setGuest(true);
        }
      })
      .catch(() => setGuest(true));
  }, []);

  const payload = useMemo(
    () => ({
      lines: lines.map((l) => ({ slug: l.productSlug, variantId: l.variantId, qty: l.qty })),
      email,
      couponCode: appliedCoupon,
      referralCode: appliedReferral,
      userId: userId ?? undefined,
    }),
    [lines, email, appliedCoupon, appliedReferral, userId],
  );

  // Live re-price (debounced): the server always has the final word.
  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      return;
    }
    const id = setTimeout(() => {
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.quote) {
            setQuote(j.quote as Quote);
            setCouponState(appliedCoupon ? "ok" : "idle");
            setReferralState(appliedReferral ? "ok" : "idle");
          } else {
            // Quote rejected (e.g. min spend) — surface on the right field.
            if (appliedCoupon) setCouponState("bad");
            else if (appliedReferral) setReferralState("bad");
          }
        })
        .catch(() => {});
    }, 450);
    return () => clearTimeout(id);
  }, [payload, lines.length, appliedCoupon, appliedReferral]);

  const applyCoupon = () => {
    setAppliedCoupon(coupon.trim().toUpperCase());
    setCouponState("idle");
  };
  const applyReferral = () => {
    setAppliedReferral(referral.trim().toUpperCase());
    setReferralState("idle");
  };

  const placeOrder = async () => {
    setPlacing(true);
    setOrderError("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: name,
        phone,
        email,
        address,
        city,
        emirate,
        notes,
        items: payload.lines,
        coupon_code: appliedCoupon || undefined,
        referral_code: appliedReferral || undefined,
        user_id: userId ?? undefined,
      }),
    });
    const j = await res.json().catch(() => null);
    setPlacing(false);
    if (res.ok && j?.order_no) {
      setDone({ orderNo: j.order_no as string, total: Number(j.total ?? 0) });
      clear();
    } else {
      setOrderError(typeof j?.error === "string" ? j.error : t("orderError"));
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center md:py-24">
        <span className="mx-auto flex size-14 items-center justify-center bg-ink text-white">
          <Check className="size-6" />
        </span>
        <h1 className="mt-6 font-display text-4xl text-ink">{t("successTitle")}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-espresso">{t("successText")}</p>
        <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.22em] text-gold">
          {t("reference")} · {done.orderNo} · {formatAED(done.total)}
        </p>
        <Button asChild className="mt-8">
          <Link href="/collection/best-sellers">{t("keepShopping")}</Link>
        </Button>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="eyebrow text-gold">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl text-ink">{t("title")}</h1>
        <p className="mt-3 text-sm text-espresso">{t("empty")}</p>
        <Button asChild className="mt-8">
          <Link href="/collection/best-sellers">{t("shopNow")}</Link>
        </Button>
      </div>
    );
  }

  const valid = name.trim() && phone.trim() && address.trim() && quote;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">{t("title")}</h1>

      {guest && (
        <div className="mt-8 flex flex-col items-start gap-4 border border-gold/40 bg-gold-wash/50 p-5 sm:flex-row sm:items-center md:p-6">
          <div>
            <p className="font-display text-xl text-ink">{t("loginTitle")}</p>
            <p className="mt-1 text-sm text-espresso">{t("loginText")}</p>
          </div>
          <Button asChild variant="outline" className="sm:ms-auto">
            <Link href="/account/login?next=/checkout">{t("loginCta")}</Link>
          </Button>
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-8">
          {/* Details */}
          <section className="border border-ink/10 bg-white p-6 md:p-8" aria-label={t("contactTitle")}>
            <h2 className="font-display text-2xl text-ink">{t("contactTitle")}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${t("name")} *`} aria-label={t("name")} className={inputCls} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={`${t("phone")} *`} aria-label={t("phone")} dir="ltr" className={inputCls} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} type="email" aria-label={t("email")} dir="ltr" className={`${inputCls} sm:col-span-2`} />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={`${t("address")} *`} aria-label={t("address")} className={`${inputCls} sm:col-span-2`} />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("city")} aria-label={t("city")} className={inputCls} />
              <input value={emirate} onChange={(e) => setEmirate(e.target.value)} placeholder={t("emirate")} aria-label={t("emirate")} className={inputCls} />
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notes")} aria-label={t("notes")} rows={2} className={`${inputCls} sm:col-span-2`} />
            </div>
          </section>

          {/* Offers */}
          <section className="border border-ink/10 bg-white p-6 md:p-8" aria-label={t("offersTitle")}>
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
              <Ticket className="size-5 text-gold" /> {t("offersTitle")}
            </h2>
            <div className="mt-5 grid gap-4">
              <div>
                <div className="flex gap-2">
                  <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={t("couponPh")} aria-label={t("couponPh")} className="font-mono uppercase" />
                  <Button variant="outline" onClick={applyCoupon} disabled={!coupon.trim()}>
                    {t("apply")}
                  </Button>
                </div>
                {couponState === "ok" && <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">{t("couponOk")}</p>}
                {couponState === "bad" && <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{t("couponBad")}</p>}
              </div>
              <div>
                <div className="flex gap-2">
                  <Input value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder={t("referralPh")} aria-label={t("referralPh")} className="font-mono uppercase" />
                  <Button variant="outline" onClick={applyReferral} disabled={!referral.trim()}>
                    {t("apply")}
                  </Button>
                </div>
                {referralState === "ok" && <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">{t("referralOk")}</p>}
                {referralState === "bad" && <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{t("referralBad")}</p>}
              </div>
            </div>
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit border border-ink/10 bg-white p-6 lg:sticky lg:top-24" aria-label="Summary">
          <ul className="divide-y divide-ink/10">
            {lines.map((l) => {
              const m = meta[l.productSlug];
              return (
                <li key={`${l.productSlug}-${l.variantId ?? ""}`} className="flex items-center gap-3 py-3 text-sm">
                  <span className="flex-1 truncate text-ink">
                    {m ? m.title : l.productSlug} <span className="text-fog">× {l.qty}</span>
                  </span>
                  <span className="text-espresso">{m ? formatAED(m.price * l.qty) : "…"}</span>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-2.5 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-fog">Subtotal</dt>
              <dd className="font-medium text-ink">{quote ? formatAED(quote.subtotal) : "…"}</dd>
            </div>
            {quote && quote.discount > 0 && (
              <div className="flex justify-between text-[#1e7a46]">
                <dt>{quote.referralDiscount > 0 && quote.discount > quote.referralDiscount ? t("discount") : quote.referralCode ? t("referralDiscount") : t("discount")}</dt>
                <dd>−{formatAED(quote.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-fog">Shipping</dt>
              <dd className="font-medium text-ink">{quote ? (quote.shipping === 0 ? "Complimentary" : formatAED(quote.shipping)) : "…"}</dd>
            </div>
            {quote?.giftTitle && (
              <div className="flex justify-between text-gold">
                <dt>Gift</dt>
                <dd className="text-end">{quote.giftTitle}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ink/10 pt-4">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink">Total</dt>
              <dd className="font-display text-xl text-ink">{quote ? formatAED(quote.total) : "…"}</dd>
            </div>
          </dl>
          {orderError && <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{orderError}</p>}
          <Button className="mt-6 w-full" size="lg" disabled={!valid || placing} onClick={placeOrder}>
            {placing ? t("placing") : t("placeOrder")}
          </Button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-fog">{t("codNote")}</p>
        </aside>
      </div>
    </div>
  );
}
