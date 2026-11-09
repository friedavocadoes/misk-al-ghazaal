"use client";
import { haptic } from "@/lib/haptics";
import { rememberFeedback } from "@/lib/analytics/survey-memory";
import { markPurchase } from "@/lib/analytics/client";
import {CartStockNotice, StockCheckoutGuard} from "@/components/blocks/CartStockNotice";
import type {CartStockIssue} from "@/lib/pricing";

import { useEffect, useMemo, useRef, useState } from "react";
import { CHECKOUT_TERMS_VERSION } from "@/lib/checkout-terms";
import { LegalLinks } from "@/components/blocks/LegalLinks";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Banknote, Check, ChevronDown, Loader2, MapPin, Ticket, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAED } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartMeta, cartVariantMeta } from "@/lib/cart-meta";
import { DeliveryAddress } from "@/components/blocks/DeliveryAddress";
import {SamplePicker} from "@/components/blocks/SamplePicker";
import {readSamples} from "@/lib/sample-tiers";
import { CouponTicket } from "@/components/blocks/CouponTicket";
import { celebrate } from "@/lib/confetti";
import { DIAL_CODES, combinePhone, splitPhone, DEFAULT_DIAL } from "@/lib/dial-codes";
import type { Locale } from "@/i18n/routing";
import type { Coupon, DeliveryAnswer, DeliveryCountry, Quote } from "@/lib/types";
import { OrderReceived, type ReceivedOrder } from "@/components/blocks/OrderReceived";
import { cn } from "@/lib/utils";
import { addressIsSupported, addressSummary, type SavedAddress } from "@/lib/saved-address";
import { CheckoutItems } from "@/components/blocks/CheckoutItems";
import { whatsappPhone } from "@/lib/whatsapp-shared";

const inputCls =
  "w-full rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-gold focus:outline-none";

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const ar = locale === "ar";
  const [step, setStep] = useState<"delivery" | "payment">("delivery");
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const goToStep = (next: typeof step) => {
    setStep(next);
    requestAnimationFrame(() => stepTitle.current?.focus());
  };
  const { lines, clear, hydrated } = useCart();
  const { meta } = useCartMeta(lines.map((l) => l.productSlug));

  const [userId, setUserId] = useState<string | null>(null);
  const [savePhone, setSavePhone] = useState(true);
  const [whatsappOptIn,setWhatsappOptIn]=useState(true);
  const [addrReady, setAddrReady] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [addressChoice, setAddressChoice] = useState<string | null>(null);
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
  const [countriesReady, setCountriesReady] = useState(false);
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
  const submitting = useRef(false);
  const [orderError, setOrderError] = useState("");
  const [done, setDone] = useState<ReceivedOrder | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account/profile", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const profile = await response.json();
        if (controller.signal.aborted) return;
        setUserId(profile.userId);
        if (profile.email) setEmail((value) => value || profile.email);
        if (profile.name) setName((value) => value || profile.name);
        if (profile.phone && !phoneTouched.current) {
          const { dial, national } = splitPhone(profile.phone);
          setDial(dial);
          setNational(national);
        }
        if (Array.isArray(profile.savedAddresses)) setSavedAddresses(profile.savedAddresses);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setAddrReady(true); });
    fetch("/api/countries", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (Array.isArray(j?.countries)) setCountries(j.countries as DeliveryCountry[]);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setCountriesReady(true); });
    // Pick up a code applied on a product page.
    try {
      const saved = localStorage.getItem("misk-coupon")?.trim().toUpperCase();
      if (saved) {
        queueMicrotask(()=>{setCoupon(saved);setAppliedCoupon(saved);setCouponState("checking");});
      }
    } catch {
      /* private mode — no handoff */
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coupons", {cache:"no-store"}).then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled) setOffers(Array.isArray(j?.coupons) ? j.coupons : []); })
      .catch(() => { if (!cancelled) setOffers([]); });
    return () => { cancelled = true; };
  }, [userId]);

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

  const [stockIssues,setStockIssues]=useState<CartStockIssue[]>([]);
  const [quoteFailure,setQuoteFailure]=useState("");
  const [quoteLoading,setQuoteLoading]=useState(true);
  const [quoteAttempt,setQuoteAttempt]=useState(0);
  // Cancel stale quotes and always settle checking, including failed/repeated requests.
  useEffect(() => {
    const controller=new AbortController();let cancelled=false;
    queueMicrotask(()=>{if(!cancelled){setQuoteLoading(true);setQuoteFailure("");}});
    const id=setTimeout(async()=>{
      const timeout=setTimeout(()=>controller.abort(),12000);
      try{
        const r=await fetch("/api/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:controller.signal});
        const j=await r.json().catch(()=>null);if(cancelled)return;
        if(r.ok && j?.quote){setStockIssues(j.stockIssues||[]);setQuote(j.quote);setCouponState(j.couponError?(j.couponError==="coupon:min"?"min":"bad"):appliedCoupon?"ok":"idle");setReferralState(j.referralError?"bad":appliedReferral?"ok":"idle");setCouponError(j.couponError||"");setReferralError(j.referralError||"");}
        else {setQuote(null);setQuoteFailure(typeof j?.error==="string"?j.error:"We couldn’t calculate your total. Please retry or check the items in your bag.");const err=typeof j?.error==="string"?j.error:"network";setCouponState(appliedCoupon?(err==="coupon:min"?"min":"bad"):"idle");setReferralState(appliedReferral?"bad":"idle");setCouponError(appliedCoupon?err:"");setReferralError(appliedReferral?err:"");}
      }catch{if(!cancelled){setQuote(null);setQuoteFailure("We couldn’t reach pricing. Please check your connection and retry.");setCouponState(appliedCoupon?"bad":"idle");setReferralState(appliedReferral?"bad":"idle");setCouponError("network");setReferralError("network");}}
      finally{clearTimeout(timeout);if(!cancelled)setQuoteLoading(false);}
    },appliedCoupon||appliedReferral?0:180);
    return()=>{cancelled=true;clearTimeout(id);controller.abort();};
  },[payload,appliedCoupon,appliedReferral,quoteAttempt]);

  const applyCoupon = () => {
    setQuoteAttempt(n=>n+1);
    const clean = coupon.trim().toUpperCase();
    // Empty apply = clear: a deleted code must never block checkout.
    setAppliedCoupon(clean);
    setCouponState(clean ? "checking" : "idle");
    if (!clean) setCouponError("");
  };
  const quickApply = (code: string) => {
    setQuoteAttempt(n=>n+1);
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
    setQuoteAttempt(n=>n+1);
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
    if (couponState === "ok" && prev !== "ok" && offersRef.current) celebrate(offersRef.current);
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
    if (msg === "terms:stale") return t("termsStale");
    return msg || t("orderError");
  };

  const hasMap = countries.length > 0;
  const supportedAddresses = hasMap
    ? savedAddresses.filter(({ address }) => addressIsSupported(address, countries))
    : savedAddresses;
  const selectedId = addressChoice ?? supportedAddresses[0]?.id;
  const selectedAddress = supportedAddresses.find(({ id }) => id === selectedId)?.address;
  const phoneOk = national.replace(/^0+/, "").length >= 7 && Boolean(whatsappPhone(phone));
  const deliveryComplete = Boolean(addrReady && countriesReady && name.trim() && phoneOk &&
    (!email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) &&
    (selectedAddress || (hasMap ? deliveryValid : address.trim() && city.trim() && emirate.trim())));
  const valid = deliveryComplete && quote && !quoteLoading && stockIssues.length === 0;

  const placeOrder = async () => {
    if (submitting.current || !valid || step !== "payment") return;
    submitting.current = true;
    haptic("selection");
    rememberFeedback({checkoutAttemptAt:Date.now()});
    window.dispatchEvent(new Event("analytics-checkout-attempt"));
    setPlacing(true);
    setOrderError("");
    try {
    // Structured delivery wins; legacy manual fields are the fallback
    // when the countries service is unreachable.
    const addr = selectedAddress ?? (delivery && deliveryValid ? delivery : null);
    const finalAddress = addr
      ? `${addr.line}${addr.building ? `, ${addr.building}` : ""}`
      : address;
    const finalCity = addr ? addr.city : city;
    const finalState = addr ? addr.state : emirate;
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkout_terms_version: CHECKOUT_TERMS_VERSION,
        payment_method: "cod",
        customer_name: name,
        phone,
        email,
        address: finalAddress,
        address_line: addr?.line,
        address_building: addr?.building,
        city: finalCity,
        emirate: finalState,
        notes,
        items: payload.lines,
        sample_ids: readSamples(),
        coupon_code: quote?.couponCode || undefined,
        referral_code: quote?.referralCode || undefined,
        user_id: userId ?? undefined,
        save_phone: userId ? savePhone : undefined,
        whatsapp_opt_in: whatsappOptIn,
        country_code: addr ? addr.countryCode : undefined,
        state: finalState,
        postcode: addr ? addr.postcode : undefined,
        address_label: addr ? addr.label : undefined,
        lat: addr ? addr.lat : undefined,
        lng: addr ? addr.lng : undefined,
      }),
    });
    const j = await res.json().catch(() => null);
    if (res.ok && j?.order_no) {
      haptic("order");
      try { localStorage.removeItem("misk-samples");window.dispatchEvent(new Event("samples-change")); } catch { /* Storage may be disabled. */ }
      setDone({
        orderNo: j.order_no,
        orderUrl: j.order_url ?? undefined,
        total: Number(j.total ?? 0),
        recipient: name.trim(),
        deliveryAddress: addr ? addressSummary(addr) : [finalAddress, finalCity, finalState].filter(Boolean).join(", "),
        items: (j.items ?? []).map((item: { title: string; qty: number; unit: number; slug: string }) => ({
          ...item,
          image: meta[item.slug]?.image ?? "",
          lineupSlug: meta[item.slug]?.lineupSlug,
        })),
      });
      try {
        localStorage.removeItem("misk-coupon");
      } catch {
        /* ignore */
      }
      markPurchase(j.order_no);
      clear();
    } else {
      haptic("error");
      setOrderError(friendlyError(j?.error));
    }
    } catch {haptic("error");setOrderError(locale==="ar"?"تعذر إرسال الطلب. يرجى المحاولة مرة أخرى.":"Couldn’t send your order. Please try again.");}
    finally {
      submitting.current = false;
      setPlacing(false);
    }
  };

  if (done) {
    return <OrderReceived order={done} locale={locale} loggedIn={!!userId} />;
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <h1 className="font-display text-4xl text-ink">{t("title")}</h1>
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-fog">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {ar ? "جارٍ تحميل حقيبتك…" : "Loading your bag…"}
        </p>
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

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">{t("title")}</h1>
      <ol aria-label={ar ? "خطوات الدفع" : "Checkout steps"} className="mt-6 grid max-w-md grid-cols-2 gap-4">
        {(["delivery", "payment"] as const).map((item, index) => (
          <li key={item} aria-current={step === item ? "step" : undefined}
            className={cn("border-b-2 pb-2.5 text-sm", step === item ? "border-gold font-semibold text-ink" : "border-ink/10 text-fog")}>
            <span className="me-2 text-xs tabular-nums text-gold">0{index + 1}</span>
            {item === "delivery" ? (ar ? "التوصيل" : "Delivery") : (ar ? "الدفع" : "Payment")}
          </li>
        ))}
      </ol>

      <CartStockNotice issues={stockIssues} loading={quoteLoading} />
      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="min-w-0 space-y-5">
          {/* Details */}
          <section hidden={step !== "delivery"} className="border border-ink/10 bg-white p-5 md:p-8" aria-label={t("contactTitle")}>
            <h2 ref={step === "delivery" ? stepTitle : undefined} tabIndex={-1} className="scroll-mt-32 font-display text-2xl text-ink">{ar ? "بيانات التوصيل" : "Delivery details"}</h2>
            {addrReady && !userId && (
              <Link href="/account/login?next=/checkout" className="mt-2 inline-block text-xs text-gold underline underline-offset-4">{t("loginTitle")}</Link>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-espresso">
                {t("name")} *
                <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-espresso">
                {t("email")}
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" className={inputCls} autoComplete="email" />
              </label>
              <div className="sm:col-span-2">
                <label htmlFor="checkout-phone" className="mb-1.5 block text-xs font-medium text-espresso">{t("phone")} *</label>
                <div className="flex gap-2" dir="ltr">
                <label className="shrink-0">
                  <span className="sr-only">{t("phone")}</span>
                  <select
                    value={dial}
                    onChange={(e) => {
                      phoneTouched.current = true;
                      setDial(e.target.value);
                    }}
                    aria-label={ar ? "رمز الاتصال الدولي" : "Country calling code"}
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
                  id="checkout-phone"
                  required
                  value={national}
                  onChange={(e) => {
                    phoneTouched.current = true;
                    setNational(e.target.value.replace(/\D/g, "").slice(0, 12));
                  }}
                  inputMode="numeric"
                  type="tel"
                  autoComplete="tel-national"
                  className={`${inputCls} min-w-0 flex-1`}
                />
                </div>
              </div>
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
              <h3 className="mb-3 text-sm font-semibold text-ink">{ar ? "عنوان التوصيل" : "Delivery address"}</h3>
              {supportedAddresses.length > 0 && (
                <fieldset className="mb-4 space-y-2">
                  <legend className="sr-only">{ar ? "العناوين المحفوظة" : "Saved addresses"}</legend>
                  {supportedAddresses.map(({ id, address }) => (
                    <label key={id} className={cn("flex cursor-pointer items-center gap-3 border p-4 text-sm", selectedId === id ? "border-gold bg-gold-wash/40" : "border-ink/15")}>
                      <input type="radio" name="delivery-address" checked={selectedId === id} onChange={() => setAddressChoice(id)} className="accent-gold" />
                      <MapPin aria-hidden className="size-4 shrink-0 text-gold" />
                      <span className="min-w-0">
                        <strong className="block text-xs text-ink">{address.label === "work" ? (ar ? "العمل" : "Work") : (ar ? "المنزل" : "Home")}</strong>
                        <span className="break-words text-espresso">{addressSummary(address)}</span>
                      </span>
                    </label>
                  ))}
                  <button type="button" onClick={() => setAddressChoice("new")} aria-pressed={selectedId === "new"}
                    className={cn("cursor-pointer border px-4 py-2 text-sm", selectedId === "new" ? "border-gold bg-gold-wash/40" : "border-ink/15 hover:border-gold")}>
                    {ar ? "+ إضافة عنوان آخر" : "+ Add another address"}
                  </button>
                </fieldset>
              )}
              {!addrReady || !countriesReady ? (
                <p role="status" className="flex items-center gap-2 py-4 text-sm text-fog"><Loader2 className="size-4 animate-spin" />{ar ? "جارٍ تحميل العناوين…" : "Loading delivery options…"}</p>
              ) : selectedAddress || step !== "delivery" ? null : hasMap ? (
                <DeliveryAddress
                  locale={locale}
                  countries={countries}
                  initial={delivery}
                  onChange={(answer, isValid) => {
                    setDelivery(answer);
                    setDeliveryValid(isValid);
                  }}
                />
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
          {step === "payment" && <>
          <section ref={offersRef} className="border border-ink/10 bg-white p-5 md:p-8" aria-label={t("offersTitle")}>
            <h2 ref={stepTitle} tabIndex={-1} className="mb-6 scroll-mt-32 font-display text-2xl text-ink">{ar ? "الدفع" : "Payment"}</h2>
            <h3 className="flex items-center gap-2 font-display text-lg text-ink">
              <Ticket className="size-5 text-gold" /> {t("offersTitle")}
            </h3>

            {appliedCoupon && couponState === "ok" ? (
              offers.find(o => o.code === appliedCoupon) ? <CouponTicket
                coupon={offers.find(o => o.code === appliedCoupon)!} locale={locale} selected
                action={<span className="flex shrink-0 items-center gap-1">
                  <span className="flex items-center gap-1 text-[11px] text-[#1e7a46]"><Check className="size-3.5"/>{quote && quote.discount > quote.referralDiscount ? `−${formatAED(Math.max(0,quote.discount-quote.referralDiscount))}` : t("couponOk")}</span>
                  <button type="button" onClick={removeCoupon} aria-label={t("couponRemove")} className="offer-reveal"><X size={14}/></button>
                </span>}
              /> : (
              <div
                key={`ok-${appliedCoupon}`}
                className="offer-pass mt-5" data-selected="true"
              >
                <span className="offer-value">
                  <Check className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-base font-bold tracking-[0.12em] text-ink">
                    {appliedCoupon}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">
                    {t("couponOk")}
                    {quote && quote.discount > quote.referralDiscount ? ` · −${formatAED(quote.discount-quote.referralDiscount)}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  aria-label={t("couponRemove")}
                  className="offer-reveal"
                >
                  <X className="size-3.5" /> {t("couponRemove")}
                </button>
              </div>
              )
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
                      "min-w-0 font-mono uppercase",
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
              <details className="mt-5 border-t border-ink/10 pt-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gold">
                  {t("offersPick")}
                </summary>
                <ul className="mt-3 grid gap-3">
                  {offers
                    .filter((o) => o.code !== appliedCoupon)
                    .map((o) => (
                      <li key={o.id}>
                        <CouponTicket
                          coupon={o}
                          locale={locale}
                          subtotal={quote?.subtotal ?? 0}
                          context="cart"
                          action={
                            <button
                              type="button"
                              disabled={(quote?.subtotal||0)<o.minSubtotal}
                              onClick={() => quickApply(o.code)}
                              className="offer-reveal"
                            >
                              {t("apply")}<ArrowUpRight size={15}/>
                            </button>
                          }
                        />
                      </li>
                    ))}
                </ul>
              </details>
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
                      <div className="flex items-center gap-3 border border-gold bg-gold-wash/40 p-4">
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
                          className="offer-reveal"
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
          <fieldset className="space-y-3 border border-ink/10 bg-white p-5 md:p-8">
            <legend className="px-2 text-sm font-semibold text-ink">{ar ? "طريقة الدفع" : "Payment method"}</legend>
            <label className="flex items-center gap-3 border border-gold bg-gold-wash/40 p-4 text-sm text-ink">
              <input type="radio" name="payment" value="cod" checked readOnly className="accent-gold" />
              <Banknote aria-hidden className="size-5 text-gold" />
              <span>{ar ? "الدفع عند الاستلام" : "Cash on delivery"}</span>
            </label>
            <label className="block cursor-not-allowed border border-ink/10 bg-ink/[0.04] p-4 text-sm text-espresso">
              <span className="flex flex-wrap items-center gap-3">
                <input type="radio" name="payment" value="tap" disabled />
                <span>Tap Payments</span>
                <span className="ms-auto text-xs">{ar ? "قريباً" : "Coming soon"}</span>
              </span>
              <span className="mt-3 flex flex-wrap gap-2 opacity-60 grayscale">
                {([["visa", "Visa"], ["mastercard", "Mastercard"], ["apple-pay", "Apple Pay"], ["tabby", "Tabby"], ["tamara", "Tamara"]] as const).map(([file, label]) => (
                  <span key={file} className="grid h-7 w-12 place-items-center rounded-sm border border-ink/10 bg-white p-1">
                    <Image src={`/payment/${file}.svg`} alt={label} width={40} height={20} unoptimized className="h-full w-full object-contain" />
                  </span>
                ))}
              </span>
            </label>
          </fieldset>
          </>}
        </div>

        {/* Summary */}
        <aside className="flex min-w-0 flex-col gap-3 border border-ink/10 bg-white p-5 [scrollbar-color:#aa9167_transparent] [scrollbar-width:thin] lg:[@media(min-height:560px)]:sticky lg:[@media(min-height:560px)]:top-24 lg:[@media(min-height:560px)]:h-[min(37rem,calc(100dvh-7rem))] lg:[@media(min-height:560px)]:overflow-y-auto" aria-labelledby="checkout-summary">
          <h2 id="checkout-summary" className="font-display text-xl text-ink">{ar ? "ملخص الطلب" : "Order summary"}</h2>
          <CheckoutItems label={ar ? "المنتجات" : "Order items"}>
            {lines.map((l) => {
              const m = cartVariantMeta(meta[l.productSlug],l.variantId);
              return (
                <li key={`${l.productSlug}-${l.variantId ?? ""}`} className="flex items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 break-words text-ink">
                    {m ? m.title : l.productSlug} <span className="text-fog">× {l.qty}</span>
                  </span>
                  <span className="shrink-0 text-espresso">{m ? formatAED(m.price * l.qty) : "…"}</span>
                </li>
              );
            })}
          </CheckoutItems>
          <div className="shrink-0 border-t border-ink/10 pt-3"><SamplePicker subtotal={quote?.subtotal ?? 0} compact /></div>
          <dl className="shrink-0 space-y-1.5 border-t border-ink/10 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fog">{ar ? "المجموع الفرعي" : "Subtotal"}</dt>
              <dd className="font-medium text-ink">{quote ? formatAED(quote.subtotal) : "…"}</dd>
            </div>
            {quote && quote.discount > quote.referralDiscount && <div className="flex justify-between text-[#1e7a46]"><dt>{t("discount")}{quote.couponCode ? ` · ${quote.couponCode}` : ""}</dt><dd>−{formatAED(quote.discount-quote.referralDiscount)}</dd></div>}
            {quote && quote.referralDiscount > 0 && <div className="flex justify-between text-[#1e7a46]"><dt>{t("referralDiscount")}</dt><dd>−{formatAED(quote.referralDiscount)}</dd></div>}
            <div className="flex justify-between">
              <dt className="text-fog">{ar ? "الشحن" : "Shipping"}</dt>
              <dd className="font-medium text-ink">{quote ? (quote.shipping === 0 ? (ar ? "مجاني" : "Complimentary") : formatAED(quote.shipping)) : "…"}</dd>
            </div>
            {quote?.giftTitle && (
              <div className="flex justify-between text-gold">
                <dt>{ar ? "هدية" : "Gift"}</dt>
                <dd className="text-end">{quote.giftTitle}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ink/10 pt-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink">{ar ? "الإجمالي" : "Total"}</dt>
              <dd className="font-display text-xl text-ink">{quote ? formatAED(quote.total) : "…"}</dd>
            </div>
          </dl>
          <div className="mt-auto shrink-0">
            {orderError && <p role="alert" className="mb-2 text-xs font-semibold text-[#9c2b2e]">{orderError}</p>}
            {quoteFailure && <p role="alert" className="mb-2 text-xs text-[#9c2b2e]">{quoteFailure} <button type="button" className="underline" onClick={() => setQuoteAttempt(n => n + 1)}>{ar ? "إعادة المحاولة" : "Retry pricing"}</button></p>}
            {step === "delivery" ? (
              <Button className="w-full" size="lg" disabled={!deliveryComplete || stockIssues.length > 0} onClick={() => goToStep("payment")}>
                {ar ? "المتابعة إلى الدفع" : "Continue to payment"}
              </Button>
            ) : (
            <StockCheckoutGuard issues={stockIssues}>
              <Button data-ios-haptic="on" className="w-full" size="lg" data-haptic="none" disabled={!valid || placing} onClick={placeOrder}>
                {placing ? t("placing") : t("placeOrder")}
              </Button>
            </StockCheckoutGuard>
            )}
            {step === "delivery" ? (
              <Link className="mt-2 block text-center text-xs text-espresso underline underline-offset-4" href="/cart">{ar ? "تعديل الحقيبة" : "Edit bag"}</Link>
            ) : (
              <button type="button" disabled={placing} onClick={() => goToStep("delivery")} className="mt-2 block w-full cursor-pointer text-center text-xs text-espresso underline underline-offset-4 disabled:opacity-50">{ar ? "تعديل عنوان التوصيل" : "Edit delivery details"}</button>
            )}
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-fog">
              <input type="checkbox" checked={whatsappOptIn} onChange={e => setWhatsappOptIn(e.target.checked)} className="mt-0.5 accent-gold" />
              {ar ? "إرسال تحديثات هذا الطلب عبر واتساب." : "Send order updates via WhatsApp."}
            </label>
            <div className="[&_p]:mt-1 [&_p]:text-[11px] [&_p]:text-fog"><LegalLinks context="checkout" /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
