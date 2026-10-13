import type { Coupon } from "./types";
import type { Locale } from "@/i18n/routing";

/** Human T&C for a coupon, generated from its admin config — powers the
    ⓘ popovers on PDP + checkout. Returns { headline, terms[] }. */

function fmtDate(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale === "ar" ? "ar-AE" : "en-AE",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  } catch {
    return iso.slice(0, 10);
  }
}

export function describeCoupon(
  c: Pick<
    Coupon,
    | "kind"
    | "amount"
    | "minSubtotal"
    | "maxDiscount"
    | "oncePerAccount"
    | "firstOrderOnly"
    | "giftTitle"
    | "giftTitleAr"
    | "endsAt"
    | "usageLimit"
  > & { giftTitle?: string },
  locale: Locale,
): { headline: string; terms: string[] } {
  const ar = locale === "ar";
  const AED = (n: number) => (ar ? `${n} درهم` : `AED ${n}`);
  const gift = c.giftTitle ?? "";
  let headline: string;
  if (c.kind === "percent")
    headline = ar ? `خصم ${c.amount}٪` : `${c.amount}% off`;
  else if (c.kind === "fixed")
    headline = ar ? `خصم ${AED(c.amount)}` : `${AED(c.amount)} off`;
  else if (c.kind === "free_shipping")
    headline = ar ? "شحن مجاني" : "Free delivery";
  else headline = gift || (ar ? "هدية مفاجئة" : "Surprise gift");

  const terms: string[] = [];
  if (c.kind === "percent" && c.maxDiscount != null) {
    terms.push(
      ar
        ? `بحد أقصى ${AED(c.maxDiscount)}`
        : `Capped at ${AED(c.maxDiscount)} off`,
    );
  }
  if (c.minSubtotal > 0) {
    terms.push(
      ar
        ? `للطلبات فوق ${AED(c.minSubtotal)}`
        : `On orders over ${AED(c.minSubtotal)}`,
    );
  }
  if (c.firstOrderOnly)
    terms.push(ar ? "للطلب الأول فقط" : "First orders only");
  if (c.oncePerAccount)
    terms.push(ar ? "استخدام واحد لكل حساب" : "One use per account");
  if (c.endsAt)
    terms.push(
      ar
        ? `صالح حتى ${fmtDate(c.endsAt, locale)}`
        : `Valid until ${fmtDate(c.endsAt, locale)}`,
    );
  if (c.usageLimit != null)
    terms.push(ar ? "عدد محدود" : "Limited redemptions");
  terms.push(
    ar ? "لا يجمع مع قسيمة أخرى" : "Cannot combine with another coupon",
  );
  return { headline, terms };
}
