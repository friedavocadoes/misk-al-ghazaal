"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Loader2, MapPin, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAED } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartMeta } from "@/lib/cart-meta";
import { DeliveryAddress } from "@/components/blocks/DeliveryAddress";
import { CouponTicket } from "@/components/blocks/CouponTicket";
import { celebrate } from "@/lib/confetti";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { DIAL_CODES, combinePhone, splitPhone, DEFAULT_DIAL } from "@/lib/dial-codes";
import type { Locale } from "@/i18n/routing";
import type { Coupon, DeliveryAnswer, DeliveryCountry, Quote } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-gold focus:outline-none";

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const { lines, clear } = useCart();
  const { meta } = useCartMeta(lines.map((l) => l.productSlug));

  const [userId, setUserId] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [savePhone, setSavePhone] = useState(true);
  const [addrInitial, setAddrInitial] = useState<{
    line?: string; building?: string; countryCode?: string; state?: string;
    city?: string; postcode?: string; label?: string; lat?: number | null; lng?: number | null;
  } | null>(null);
  const [addrReady, setAddrReady] = useState(false);
  const [addrKey, setAddrKey] = useState(0);
  const [savedAddr, setSavedAddr] = useState<{
    initial: {
      line?: string; building?: string; countryCode?: string; state?: string;
      city?: string; postcode?: string; label?: string; lat?: number | null; lng?: number | null;
    };
    summary: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [dial, setDial] = useState(DEFAULT_DIAL);
  const [national, setNational] = useState("");
  const phoneTouched = useRef(false);
  const phone = combinePhone(dial, national);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dubai");
  const [emirate, setEmirate] = useState("Dubai");
  const [notes, setNotes] = useState("");
  const [countries, setCountries] = useState<DeliveryCountry[]>([]);
  const [delivery, setDelivery] = useState<DeliveryAnswer | null>(null);
  const [deliveryValid, setDeliveryValid] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponState, setCouponState] = useState<"idle" | "checking" | "ok" | "bad" | "min">("idle");
  const [referral, setReferral] = useState("");
  const [appliedReferral, setAppliedReferral] = useState("");
  const [referralState, setReferralState] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [referralOpen, setReferralOpen] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [referralError, setReferralError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [offers, setOffers] = useState<Coupon[]>([]);
  const offersRef = useRef<HTMLElement>(null);
  const prevCouponState = useRef(couponState);
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
          // Autofill from the account (profile → last order fallback).
          // Functional sets only fill blanks, so a fast typer is never
          // clobbered by the late response.
          fetch("/api/account/profile")
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
              if (!j || typeof j !== "object") return;
              const nm = typeof j.name === "string" ? j.name : "";
              const ph = typeof j.phone === "string" ? j.phone : "";
              if (nm) setName((v) => v || nm);
              if (ph && !phoneTouched.current) {
                const split = splitPhone(ph);
                setDial(split.dial);
                setNational(split.national);
              }
              const saved = (j.defaultAddress ?? null) as {
                line?: string; city?: string; state?: string; postcode?: string;
                country_code?: string; countryCode?: string; label?: string;
                lat?: number | null; lng?: number | null;
              } | null;
              const last = (j.lastOrder ?? null) as {
                address?: string; city?: string; emirate?: string; state_name?: string;
                postcode?: string; country_code?: string;
              } | null;
              if (saved && typeof saved === "object") {
                const initial = {
                  line: saved.line ?? "",
                  countryCode: saved.countryCode ?? saved.country_code ?? undefined,
                  state: saved.state ?? "",
                  city: saved.city ?? "",
                  postcode: saved.postcode ?? "",
                  label: saved.label ?? "",
                  lat: saved.lat ?? null,
                  lng: saved.lng ?? null,
                };
                setAddrInitial(initial);
                const bits = [saved.line ?? "", saved.city ?? "", saved.state ?? ""].filter(Boolean);
                if (bits.length) setSavedAddr({ initial, summary: bits.join(" · ") });
                setAddress((v) => v || saved.line || "");
                setCity((v) => (v && v !== "Dubai") || !saved.city ? v : saved.city || v);
                setEmirate((v) => (v && v !== "Dubai") || !saved.state ? v : saved.state || v);
              } else if (last) {
                setAddress((v) => v || last.address || "");
                if (last.city) setCity((v) => (v && v !== "Dubai" ? v : last.city!));
                const st = last.state_name || last.emirate || "";
                if (st) setEmirate((v) => (v && v !== "Dubai" ? v : st));
              }
              setPrefilled(true);
            })
            .catch(() => {})
            .finally(() => setAddrReady(true));
        } else {
          setGuest(true);
          setAddrReady(true);
        }
      })
      .catch(() => {
        setGuest(true);
        setAddrReady(true);
      });
    fetch("/api/countries")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (Array.isArray(j?.countries)) setCountries(j.countries as DeliveryCountry[]);
      })
      .catch(() => {});
    // Pick up a code applied on a product page.
    try {
      const saved = localStorage.getItem("misk-coupon")?.trim().toUpperCase();
      if (saved) {
        setCoupon(saved);
        setAppliedCoupon(saved);
        setCouponState("checking");
      }
    } catch {
      /* private mode — no handoff */
    }
    fetch("/api/coupons")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (Array.isArray(j?.coupons)) setOffers(j.coupons as Coupon[]);
      })
      .catch(() => {});
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
  // Checking states ride the round-trip so every Apply gets feedback.
  useEffect(() => {
    const id = setTimeout(() => {
      fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => null) as { quote?: Quote; error?: string } | null }))
        .then(({ ok, j }) => {
          if (ok && j?.quote) {
            setQuote(j.quote);
            setCouponState(appliedCoupon ? "ok" : "idle");
            setReferralState(appliedReferral ? "ok" : "idle");
            setCouponError("");
            setReferralError("");
          } else {
            const err = typeof j?.error === "string" ? j.error : "";
            if (appliedCoupon && (!err || err.startsWith("coupon"))) {
              setCouponState(err === "coupon:min" ? "min" : "bad");
              setCouponError(err);
            } else if (appliedReferral && (!err || err.startsWith("referral"))) {
              setReferralState("bad");
              setReferralError(err);
            }
          }
        })
        .catch(() => {
          if (appliedCoupon) setCouponState("idle");
          if (appliedReferral) setReferralState("idle");
        });
    }, 450);
    return () => clearTimeout(id);
  }, [payload, lines.length, appliedCoupon, appliedReferral]);

  const applyCoupon = () => {
    const clean = coupon.trim().toUpperCase();
    // Empty apply = clear: a deleted code must never block checkout.
    setAppliedCoupon(clean);
    setCouponState(clean ? "checking" : "idle");
    if (!clean) setCouponError("");
  };
  const quickApply = (code: string) => {
    setCoupon(code);
    setAppliedCoupon(code);
    setCouponState("checking");
  };
  const removeCoupon = () => {
    setCoupon("");
    setAppliedCoupon("");
    setCouponState("idle");
    setCouponError("");
    try {
      localStorage.removeItem("misk-coupon");
    } catch {
      /* ignore */
    }
  };
  const removeReferral = () => {
    setReferral("");
    setAppliedReferral("");
    setReferralState("idle");
  };
  const applyReferral = () => {
    const clean = referral.trim().toUpperCase();
    setAppliedReferral(clean);
    setReferralState(clean ? "checking" : "idle");
  };
  // Clearing the field clears the code (applied codes never linger).
  const onCouponInput = (v: string) => {
    setCoupon(v.toUpperCase());
    if (!v.trim() && appliedCoupon) {
      setAppliedCoupon("");
      setCouponState("idle");
    }
  };
  const onReferralInput = (v: string) => {
    setReferral(v.toUpperCase());
    if (!v.trim() && appliedReferral) {
      setAppliedReferral("");
      setReferralState("idle");
    }
  };

  // Persist the applied code (PDP handoff) and celebrate/shake on
  // transitions only — re-quotes while bad must not re-shake.
  useEffect(() => {
    try {
      if (appliedCoupon) localStorage.setItem("misk-coupon", appliedCoupon);
      else localStorage.removeItem("misk-coupon");
    } catch {
      /* ignore */
    }
  }, [appliedCoupon]);

  useEffect(() => {
    const prev = prevCouponState.current;
    prevCouponState.current = couponState;
    if (couponState === "ok" && prev !== "ok") celebrate(offersRef.current);
    if ((couponState === "bad" || couponState === "min") && prev !== couponState) {
      setShakeKey((k) => k + 1);
    }
  }, [couponState]);

  const couponReason = (): string => {
    if (couponState === "min") return t("couponMin");
    if (couponError === "coupon:login") return t("couponLogin");
    if (couponError === "coupon:used") return t("couponUsed");
    if (couponError === "coupon:expired") return t("couponExpired");
    if (couponError === "coupon:exhausted") return t("couponExhausted");
    if (couponError === "coupon:unknown") return t("couponUnknown");
    if (couponError === "coupon:inactive") return t("couponInactive");
    if (couponError === "coupon:early") return t("couponEarly");
    if (couponError === "coupon:personal") return t("couponPersonal");
    if (couponError === "coupon:repeat") return t("couponRepeat");
    return t("couponBad");
  };

  const referralReason = (): string => {
    if (referralError === "referral:off") return t("referralOff");
    if (referralError === "referral:self") return t("referralSelf");
    if (referralError === "referral:repeat") return t("referralRepeat");
    return t("referralBad");
  };

  const friendlyError = (raw: unknown): string => {
    const msg = typeof raw === "string" ? raw : "";
    if (msg.startsWith("coupon:")) return msg === "coupon:min" ? t("couponMin") : t("couponBad");
    if (msg.startsWith("referral:")) return t("referralBad");
    if (msg.startsWith("delivery:")) return t("deliveryNo");
    // Backend/config failures (RLS, keys) read as gibberish — translate.
    if (/row-level security|permission denied|secret|service_role|JWT|Failed fetch|fetch failed/i.test(msg)) {
      return t("serverError");
    }
    return msg || t("orderError");
  };

  const placeOrder = async () => {
    setPlacing(true);
    setOrderError("");
    // Structured delivery wins; legacy manual fields are the fallback
    // when the countries service is unreachable.
    const addr = delivery && deliveryValid ? delivery : null;
    const finalAddress = addr
      ? `${addr.line}${addr.building ? `, ${addr.building}` : ""}`
      : address;
    const finalCity = addr ? addr.city : city;
    const finalState = addr ? addr.state : emirate;
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: name,
        phone,
        email,
        address: finalAddress,
        city: finalCity,
        emirate: finalState,
        notes,
        items: payload.lines,
        coupon_code: appliedCoupon || undefined,
        referral_code: appliedReferral || undefined,
        user_id: userId ?? undefined,
        save_phone: userId ? savePhone : undefined,
        country_code: addr ? addr.countryCode : undefined,
        state: finalState,
        postcode: addr ? addr.postcode : undefined,
        address_label: addr ? addr.label : undefined,
        lat: addr ? addr.lat : undefined,
        lng: addr ? addr.lng : undefined,
      }),
    });
    const j = await res.json().catch(() => null);
    setPlacing(false);
    if (res.ok && j?.order_no) {
      setDone({ orderNo: j.order_no as string, total: Number(j.total ?? 0) });
      try {
        localStorage.removeItem("misk-coupon");
      } catch {
        /* ignore */
      }
      clear();
    } else {
      setOrderError(friendlyError(j?.error));
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

  const hasMap = countries.length > 0;
  const phoneOk = national.replace(/\D/g, "").length >= 7;
  const valid = name.trim() && phoneOk && (hasMap ? deliveryValid : address.trim()) && quote;

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
            {prefilled && (
              <p className="mt-1.5 text-[13px] text-[#1e7a46]">{t("prefilled")}</p>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${t("name")} *`} aria-label={t("name")} className={inputCls} autoComplete="name" />
              <div className="flex gap-2" dir="ltr">
                <label className="shrink-0">
                  <span className="sr-only">{t("phone")}</span>
                  <select
                    value={dial}
                    onChange={(e) => {
                      phoneTouched.current = true;
                      setDial(e.target.value);
                    }}
                    aria-label={t("phone")}
                    className="h-full cursor-pointer rounded-[2px] border border-ink/20 bg-white px-2 py-3 text-sm text-ink focus:border-gold focus:outline-none"
                  >
                    {DIAL_CODES.map((d) => (
                      <option key={`${d.code}-${d.country}`} value={d.code}>
                        +{d.code}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  value={national}
                  onChange={(e) => {
                    phoneTouched.current = true;
                    setNational(e.target.value.replace(/\D/g, "").slice(0, 12));
                  }}
                  placeholder={`${t("phone")} *`}
                  aria-label={t("phone")}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  className={`${inputCls} min-w-0 flex-1`}
                />
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} type="email" aria-label={t("email")} dir="ltr" className={`${inputCls} sm:col-span-2`} autoComplete="email" />
            </div>
            {userId && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] leading-relaxed text-fog">
                <input
                  type="checkbox"
                  checked={savePhone}
                  onChange={(e) => setSavePhone(e.target.checked)}
                  className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-[#8a6d2f]"
                />
                <span>{t("savePhone")}</span>
              </label>
            )}
            <div className="mt-6">
              {savedAddr && (
                <button
                  type="button"
                  onClick={() => {
                    setAddrInitial(savedAddr.initial);
                    setAddrKey((k) => k + 1);
                  }}
                  className="mb-4 flex w-full cursor-pointer items-center gap-3 border border-gold/50 bg-gold-wash/50 p-4 text-left transition hover:border-gold"
                >
                  <MapPin className="size-5 shrink-0 text-gold" />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                      {t("savedAddrTitle")}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink">{savedAddr.summary}</span>
                  </span>
                </button>
              )}
              {hasMap ? (
                addrReady ? (
                  <DeliveryAddress
                    key={addrKey}
                    locale={locale}
                    countries={countries}
                    initial={addrInitial}
                    onChange={(a, v) => {
                      setDelivery(a);
                      setDeliveryValid(v);
                    }}
                  />
                ) : (
                  <div className="h-64 w-full animate-pulse border border-ink/15 bg-sand md:h-72" />
                )
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={`${t("address")} *`} aria-label={t("address")} className={`${inputCls} sm:col-span-2`} />
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("city")} aria-label={t("city")} className={inputCls} />
                  <input value={emirate} onChange={(e) => setEmirate(e.target.value)} placeholder={t("emirate")} aria-label={t("emirate")} className={inputCls} />
                </div>
              )}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notes")} aria-label={t("notes")} rows={2} className={`${inputCls} mt-4`} />
          </section>

          {/* Offers */}
          <section ref={offersRef} className="border border-ink/10 bg-white p-6 md:p-8" aria-label={t("offersTitle")}>
            <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
              <Ticket className="size-5 text-gold" /> {t("offersTitle")}
            </h2>

            {appliedCoupon && couponState === "ok" ? (
              <div
                key={`ok-${appliedCoupon}`}
                className="mt-5 flex animate-[heart-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)] items-center gap-3 border border-[#1e7a46]/40 bg-[#1e7a46]/[0.07] p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1e7a46] text-white">
                  <Check className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-base font-bold tracking-[0.12em] text-ink">
                    {appliedCoupon}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">
                    {t("couponOk")}
                    {quote && quote.discount > 0 ? ` · −${formatAED(quote.discount)}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  aria-label={t("couponRemove")}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-ink/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso transition hover:border-[#9c2b2e] hover:text-[#9c2b2e]"
                >
                  <X className="size-3.5" /> {t("couponRemove")}
                </button>
              </div>
            ) : (
              <div key={`in-${shakeKey}`} className={cn(couponState === "bad" || couponState === "min" ? "coupon-shake" : "")}>
                <label htmlFor="coupon-input" className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
                  {t("couponLabel")}
                </label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="coupon-input"
                    value={coupon}
                    onChange={(e) => onCouponInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCoupon();
                      }
                    }}
                    placeholder="XXXX"
                    aria-label={t("couponLabel")}
                    dir="ltr"
                    className={cn(
                      "font-mono uppercase",
                      (couponState === "bad" || couponState === "min") && "border-[#9c2b2e]",
                    )}
                  />
                  <Button variant="outline" onClick={applyCoupon} disabled={couponState === "checking" || !coupon.trim()} className="shrink-0">
                    {couponState === "checking" ? <Loader2 className="size-4 animate-spin" /> : t("apply")}
                  </Button>
                </div>
                {couponState === "checking" && <p className="mt-2 animate-pulse text-[12px] font-semibold uppercase tracking-[0.14em] text-fog">{t("couponChecking")}</p>}
                {(couponState === "bad" || couponState === "min") && (
                  <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{couponReason()}</p>
                )}
              </div>
            )}

            {offers.length > 0 && !(appliedCoupon && couponState === "ok") && (
              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
                  {t("offersPick")}
                </p>
                <ul className="mt-3 grid gap-3">
                  {offers
                    .filter((o) => o.code !== appliedCoupon)
                    .map((o) => (
                      <li key={o.id}>
                        <CouponTicket
                          coupon={o}
                          locale={locale}
                          compact
                          action={
                            <button
                              type="button"
                              onClick={() => quickApply(o.code)}
                              className="shrink-0 cursor-pointer border border-ink bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-gold-soft hover:text-ink"
                            >
                              {t("apply")}
                            </button>
                          }
                        />
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="mt-6 border-t border-ink/10 pt-5">
              <button
                type="button"
                onClick={() => setReferralOpen((v) => !v)}
                aria-expanded={referralOpen}
                className="flex w-full cursor-pointer items-center justify-between text-left"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
                  {t("referralQ")}
                </span>
                <ChevronDown className={cn("size-4 text-gold transition-transform duration-300", referralOpen && "rotate-180")} />
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ gridTemplateRows: referralOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="pt-4">
                    {appliedReferral && referralState === "ok" ? (
                      <div className="flex items-center gap-3 border border-[#1e7a46]/40 bg-[#1e7a46]/[0.07] p-4">
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-base font-bold tracking-[0.12em] text-ink">
                            {appliedReferral}
                          </span>
                          <span className="mt-0.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">
                            {t("referralOk")}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={removeReferral}
                          aria-label={t("couponRemove")}
                          className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-ink/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso transition hover:border-[#9c2b2e] hover:text-[#9c2b2e]"
                        >
                          <X className="size-3.5" /> {t("couponRemove")}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2">
                          <Input
                            value={referral}
                            onChange={(e) => onReferralInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                applyReferral();
                              }
                            }}
                            placeholder="XXXX"
                            aria-label={t("referralPh")}
                            dir="ltr"
                            className="font-mono uppercase"
                          />
                          <Button variant="outline" onClick={applyReferral} disabled={referralState === "checking" || !referral.trim()} className="shrink-0">
                            {referralState === "checking" ? <Loader2 className="size-4 animate-spin" /> : t("apply")}
                          </Button>
                        </div>
                        {referralState === "checking" && <p className="mt-2 animate-pulse text-[12px] font-semibold uppercase tracking-[0.14em] text-fog">{t("couponChecking")}</p>}
                        {referralState === "bad" && <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{referralReason()}</p>}
                      </div>
                    )}
                  </div>
                </div>
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
