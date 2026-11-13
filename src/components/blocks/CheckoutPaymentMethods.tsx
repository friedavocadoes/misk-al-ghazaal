"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Banknote } from "lucide-react";
import { TAP_METHODS, type CheckoutMethod, type PaymentLimits, type PaymentOptions, type PaymentRestriction } from "@/lib/checkout-payment";
import { cn, formatAED } from "@/lib/utils";

export function useCheckoutPaymentOptions(active: boolean) {
  const [methods, setMethods] = useState<PaymentOptions | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    fetch("/api/checkout/payment/options", { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(config => {
        if (controller.signal.aborted) return;
        const matchesOrigin = config?.origin === window.location.origin;
        setMethods(matchesOrigin ? config.methods : {});
        setSandbox(matchesOrigin && config.sandbox === true);
        const apple = (window as Window & { ApplePaySession?: { canMakePayments: () => boolean } }).ApplePaySession;
        try { setAppleAvailable(apple?.canMakePayments() === true); } catch { setAppleAvailable(false); }
      })
      .catch(() => { if (!controller.signal.aborted) { setMethods({}); setSandbox(false); } });
    return () => controller.abort();
  }, [active]);
  return { methods, appleAvailable, sandbox };
}

export function checkoutPaymentReason(reason: PaymentRestriction, limits: PaymentLimits | undefined, ar: boolean) {
  switch (reason) {
    case "unavailable": return ar ? "طريقة الدفع هذه غير متاحة حالياً." : "This payment method is currently unavailable.";
    case "minimum": return ar ? `الحد الأدنى للدفع بهذه الطريقة ${formatAED(limits?.min ?? 0)}.` : `Available on totals of ${formatAED(limits?.min ?? 0)} or more.`;
    case "maximum": return ar ? `الحد الأقصى للدفع بهذه الطريقة ${formatAED(limits?.max ?? 0)}.` : `Available on totals up to ${formatAED(limits?.max ?? 0)}.`;
    case "uae": return ar ? "متاح للتوصيل داخل الإمارات." : "Available for delivery within the UAE.";
    case "mobile": return ar ? "اختر ‎+971 في بيانات التوصيل وأدخل رقم هاتف متحرك إماراتياً مثل 50 123 4567." : "In delivery details, select +971 and enter a UAE mobile number, for example 50 123 4567.";
    case "apple": return ar ? "استخدم جهازاً ومتصفحاً يدعمان Apple Pay." : "Use a device and browser that support Apple Pay.";
  }
}

export function tapMerchantMismatchMessage(ar: boolean) {
  return ar ? "مفتاح Tap التجريبي ومعرّف التاجر مرتبطان بحسابين مختلفين. صحّح بيانات Tap في إعدادات النشر ثم أعد المحاولة."
    : "The Tap test secret and Merchant ID belong to different accounts. Update the Tap credentials in your deployment and try again.";
}

const onlineMethods = {
  card: { en: "Credit or debit card", ar: "بطاقة ائتمان أو خصم", images: ["visa", "mastercard"] },
  apple_pay: { en: "Apple Pay", ar: "Apple Pay", images: ["apple-pay"] },
  tabby: { en: "Pay later with Tabby", ar: "ادفع لاحقاً مع تابي", images: ["tabby"] },
  tamara: { en: "Pay later with Tamara", ar: "ادفع لاحقاً مع تمارا", images: ["tamara"] },
} as const;

export function CheckoutPaymentMethods({ ar, selected, choose, disabled, describe, sandbox }: {
  ar: boolean;
  selected: CheckoutMethod;
  choose: (method: CheckoutMethod) => void;
  disabled: boolean;
  describe: (method: typeof TAP_METHODS[number]) => string | undefined;
  sandbox: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3 border border-ink/10 bg-white p-5 md:p-8">
      <legend className="px-2 text-sm font-semibold text-ink">{ar ? "طريقة الدفع" : "Payment method"}</legend>
      {sandbox && <p className="border border-gold/40 bg-gold-wash/40 p-3 text-xs leading-5 text-ink">
        {ar ? "وضع اختبار Tap للموظفين. اختر طريقة دفع إلكترونية لإجراء دفعة تجريبية. الدفع عند الاستلام ينشئ طلباً فعلياً."
          : "Tap sandbox for staff. Choose an online method to run a test payment. Cash on delivery places a real order."}
      </p>}
      {(["cod", ...TAP_METHODS] as const).map(method => {
        const online = method === "cod" ? null : onlineMethods[method];
        const reason = method === "cod" ? undefined : describe(method);
        const label = online ? (ar ? online.ar : online.en) : (ar ? "الدفع عند الاستلام" : "Cash on delivery");
        const detail = reason ?? (method === "tabby" || method === "tamara"
          ? (ar ? "يحدد مزود التقسيط الأهلية النهائية عند الدفع." : "The installment provider confirms eligibility at payment.")
          : undefined);
        return (
          <label key={method} className={cn("flex flex-wrap items-start gap-x-3 gap-y-2 border p-4 text-sm", reason
            ? "cursor-not-allowed border-ink/10 bg-ink/[0.04] text-fog"
            : selected === method ? "cursor-pointer border-gold bg-gold-wash/40 text-ink" : "cursor-pointer border-ink/15 text-ink")}>
            <input type="radio" name="payment" value={method} checked={selected === method} disabled={Boolean(reason)}
              onChange={() => choose(method)} aria-labelledby={`payment-${method}-label`}
              aria-describedby={detail ? `payment-${method}-detail` : undefined} className="mt-1 accent-gold" />
            {method === "cod" && <Banknote aria-hidden className="size-5 text-gold" />}
            <span className="min-w-36 flex-1">
              <span id={`payment-${method}-label`} className="block font-medium">{label}</span>
              {detail && <span id={`payment-${method}-detail`} className="mt-1 block text-xs leading-5 text-fog">{detail}</span>}
            </span>
            {online && <span className={cn("flex gap-1.5", reason && "opacity-50 grayscale")} aria-hidden>
              {online.images.map(file => <span key={file} className="grid h-7 w-11 place-items-center rounded-sm border border-ink/10 bg-white p-1">
                <Image src={`/payment/${file}.svg`} alt="" width={40} height={20} unoptimized className="h-full w-full object-contain" />
              </span>)}
            </span>}
          </label>
        );
      })}
      {sandbox && selected === "card" && !describe("card") && (
        <div className="border border-ink/10 p-3 text-xs leading-6 text-espresso">
          <p className="font-medium text-ink">{ar ? "بطاقة Visa لاختبار الدفع" : "Visa test card"}</p>
          <p dir="ltr" className="select-all text-start tabular-nums">4508 7500 1574 1019</p>
          <p>{ar ? "الانتهاء 01/39 · رمز الأمان 100. اختر نجاح المصادقة في شاشة الاختبار أو أدخل 1234 إذا طُلب رمز." : "Expiry 01/39 · CVV 100. Choose successful authentication in the simulator, or enter 1234 if prompted for a code."}</p>
          <a className="underline underline-offset-4" href="https://developers.tap.company/reference/testing-cards" target="_blank" rel="noreferrer">
            {ar ? "بطاقات اختبار Tap" : "Tap test cards"}
          </a>
        </div>
      )}
      <p className="text-xs leading-5 text-fog">{ar ? "تُستكمل المدفوعات الإلكترونية عبر Tap Payments." : "Online payments are completed securely through Tap Payments."}</p>
    </fieldset>
  );
}
