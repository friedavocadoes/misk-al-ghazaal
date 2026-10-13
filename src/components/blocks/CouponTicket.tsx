"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Info, X } from "lucide-react";
import type { Coupon } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CouponIcon } from "@/components/ui/coupon-icons";
import { describeCoupon } from "@/lib/coupon-text";

/** Short benefit line under a coupon code (mirrors the PDP strip). */
export function couponBlurb(
  c: Pick<Coupon, "kind" | "amount" | "minSubtotal" | "maxDiscount" | "giftTitle" | "giftTitleAr">,
  locale: Locale,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const over = c.minSubtotal > 0 ? ` · ${t("couponOver")} ${c.minSubtotal}` : "";
  const cap = c.maxDiscount != null ? ` · ${t("couponCap", { max: c.maxDiscount })}` : "";
  if (c.kind === "percent") return `${c.amount}% ${t("couponOff")}${cap}${over}`;
  if (c.kind === "fixed") return `${t("couponSave")} ${c.amount}${cap}${over}`;
  if (c.kind === "free_shipping") return t("couponShip");
  return (c.giftTitle ? tx(c.giftTitle, c.giftTitleAr, locale) : t("couponGift")) + over;
}

/** ⓘ button → T&C popover, generated from the coupon's admin config. */
export function CouponInfo({ coupon, locale, dark }: { coupon: Coupon; locale: Locale; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLSpanElement>(null);
  const { headline, terms } = describeCoupon(coupon, locale);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <span ref={boxRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={headline}
        className={cn(
          "flex size-6 cursor-pointer items-center justify-center rounded-full border transition",
          open
            ? "border-gold bg-gold text-white"
            : dark
              ? "border-white/40 text-white/70 hover:border-white hover:text-white"
              : "border-ink/25 text-fog hover:border-gold hover:text-gold",
        )}
      >
        {open ? <X className="size-3" /> : <Info className="size-3" />}
      </button>
      {open && (
        <span className="absolute end-0 top-full z-40 mt-2 w-60 animate-[account-in_0.22s_cubic-bezier(0.22,1,0.36,1)] border border-ink/10 bg-white p-4 text-start shadow-[0_24px_48px_-20px_rgba(28,25,23,0.4)]">
          <span className="block font-display text-base text-ink">{headline}</span>
          <span className="mt-1 block font-mono text-[11px] tracking-[0.14em] text-gold">{coupon.code}</span>
          <ul className="mt-2 space-y-1">
            {terms.map((term) => (
              <li key={term} className="flex gap-2 text-[12px] leading-relaxed text-espresso">
                <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-gold" />
                {term}
              </li>
            ))}
          </ul>
        </span>
      )}
    </span>
  );
}

/** Perfume-house ticket: ink medallion, serif code, benefit line, action. */
export function CouponTicket({
  coupon,
  locale,
  action,
  compact,
}: {
  coupon: Coupon;
  locale: Locale;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  const t = useTranslations("Product");
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 border border-dashed border-gold/60 bg-cream",
        compact ? "p-3" : "p-4",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-ink text-gold-soft",
          compact ? "size-9" : "size-11",
        )}
      >
        <CouponIcon icon={coupon.icon} className={compact ? "size-4" : "size-5"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn("truncate font-mono font-bold tracking-[0.12em] text-ink", compact ? "text-sm" : "text-base")}>
            {coupon.code}
          </span>
          <CouponInfo coupon={coupon} locale={locale} />
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-espresso">
          {couponBlurb(coupon, locale, t)}
          {coupon.firstOrderOnly ? ` · ${t("couponFirst")}` : ""}
        </span>
      </span>
      {action}
    </div>
  );
}
