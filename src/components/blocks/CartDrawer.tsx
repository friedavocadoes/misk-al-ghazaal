"use client";
import {
  editionFor,
  isOriginales,
  storefrontProductPath,
} from "@/features/originales/config";
import { haptic } from "@/lib/haptics";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowUpRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatAED } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useCartMeta, cartVariantMeta } from "@/lib/cart-meta";

export function CartDrawer({
  open,
  onOpenChange,
  originales = false,
  originalesTint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originales?: boolean;
  originalesTint?: string;
}) {
  const t = useTranslations("Cart");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const { lines, count, setQty, remove } = useCart();
  const { meta, loading } = useCartMeta(lines.map((l) => l.productSlug));

  const rows = lines.flatMap((line) => {
    const product = cartVariantMeta(meta[line.productSlug], line.variantId);
    if (!product) return [];
    const variant = product.variants?.find(
      (item) => item.id === line.variantId,
    );
    const edition =
      originales && isOriginales(product) ? editionFor(product) : undefined;
    const bottle =
      variant?.use_product_images === false && variant.images?.[0]
        ? undefined
        : edition?.bottle;
    return [
      {
        ...line,
        product,
        href: storefrontProductPath(product),
        bottle,
        edition,
      },
    ];
  });
  const subtotal = rows.reduce((s, l) => s + l.product.price * l.qty, 0);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        haptic(next ? "open" : "close");
        onOpenChange(next);
      }}
    >
      <SheetContent
        data-originales-drawer={originales ? "bag" : undefined}
        dir={originales && locale === "ar" ? "rtl" : undefined}
        style={
          originalesTint
            ? ({ "--drawer-tint": originalesTint } as React.CSSProperties)
            : undefined
        }
      >
        <SheetHeader>
          {originales && (
            <span className="originales-drawer-kicker">
              MAG PARFUM · ORIGINALES
            </span>
          )}
          <SheetTitle>
            {t("bagCount")} ({count})
          </SheetTitle>
          {originales && (
            <SheetDescription className="sr-only">
              {locale === "ar"
                ? "محتويات حقيبة التسوق"
                : "Your shopping bag contents"}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {originales && loading && rows.length === 0 && count > 0 ? (
            <p className="py-10 text-center text-sm text-fog" role="status">
              {locale === "ar" ? "جارٍ تحميل الحقيبة…" : "Loading your bag…"}
            </p>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              {originales && (
                <ShoppingBag
                  className="originales-drawer-empty"
                  aria-hidden="true"
                />
              )}
              <p className="text-sm text-fog">{t("empty")}</p>
              <Button
                asChild
                variant="outline"
                className="mt-5"
                onClick={() => onOpenChange(false)}
              >
                <Link
                  href={originales ? "/originales" : "/collection/best-sellers"}
                >
                  {t("continue")}
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-ink/10">
              {rows.map((l) => (
                <li
                  key={`${l.productSlug}-${l.variantId ?? ""}`}
                  className="flex gap-4 py-4"
                >
                  <Link
                    href={l.href}
                    onClick={() => onOpenChange(false)}
                    className="relative block size-16 shrink-0 overflow-hidden bg-sand"
                    data-originales-bottle={l.bottle ? "" : undefined}
                    style={
                      l.edition
                        ? ({
                            "--bag-edition": l.edition.accent,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {(l.bottle || l.product.image) && (
                      <Image
                        src={l.bottle || l.product.image}
                        alt={l.product.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={l.href}
                      onClick={() => onOpenChange(false)}
                      className="block truncate text-[13px] font-medium text-ink hover:text-gold"
                    >
                      {tx(l.product?.title ?? "", l.product?.titleAr, locale)}
                    </Link>
                    <p className="mt-0.5 text-[13px] text-espresso">
                      {formatAED((l.product?.price ?? 0) * l.qty)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="flex items-center border border-ink/15">
                        <button
                          data-ios-haptic="on"
                          className="p-1.5 text-espresso hover:text-ink"
                          aria-label={t("decrease")}
                          onClick={() =>
                            setQty(l.productSlug, l.variantId, l.qty - 1)
                          }
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">
                          {l.qty}
                        </span>
                        <button
                          data-ios-haptic="on"
                          className="p-1.5 text-espresso hover:text-ink"
                          aria-label={t("increase")}
                          onClick={() =>
                            setQty(l.productSlug, l.variantId, l.qty + 1)
                          }
                        >
                          <Plus className="size-3" />
                        </button>
                      </span>
                      <button
                        data-ios-haptic="on"
                        className="p-1 text-fog transition hover:text-[#9c2b2e]"
                        aria-label={t("remove")}
                        onClick={() => remove(l.productSlug, l.variantId)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {rows.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-5">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="uppercase tracking-[0.16em] text-fog">
                {t("subtotal")}
              </span>
              <span className="font-display text-lg text-ink">
                {formatAED(subtotal)}
              </span>
            </div>
            <div className="grid gap-2">
              <Button
                asChild
                data-ios-haptic="on"
                data-haptic="step"
                onClick={() => onOpenChange(false)}
              >
                <Link
                  href="/cart"
                  data-originales-bag-action={
                    originales ? "primary" : undefined
                  }
                >
                  {t("viewBag")}
                  {originales && <ShoppingBag aria-hidden="true" />}
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                data-ios-haptic="on"
                data-haptic="step"
                onClick={() => onOpenChange(false)}
              >
                <Link
                  href="/checkout"
                  data-originales-bag-action={
                    originales ? "secondary" : undefined
                  }
                >
                  {t("toCheckout")}
                  {originales && <ArrowUpRight aria-hidden="true" />}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
