"use client";
import {CartStockNotice, StockCheckoutGuard} from "./CartStockNotice";
import type {CartStockIssue} from "@/lib/pricing";

import {useEffect,useState} from "react";
import {PdpOffers} from "./PdpOffers";
import {SamplePicker} from "./SamplePicker";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { formatAED } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { useCartMeta } from "@/lib/cart-meta";
import { FLAT_SHIPPING, FREE_SHIP_THRESHOLD } from "@/lib/pricing-client";

export function BagView() {
  const t = useTranslations("Cart");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const { lines, setQty, remove } = useCart();
  const { meta } = useCartMeta(lines.map((l) => l.productSlug));

  const rows = lines
    .map((l) => ({ ...l, product: meta[l.productSlug] }))
    .filter((l) => l.product);
  const cartKey=JSON.stringify(lines);
  const [serverQuote,setServerQuote]=useState<{key:string;total:number;stockIssues:CartStockIssue[]}|null>(null);
  const serverSubtotal=serverQuote?.key===cartKey?serverQuote.total:null;
  useEffect(()=>{const controller=new AbortController();if(lines.length)fetch("/api/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lines:lines.map(l=>({slug:l.productSlug,variantId:l.variantId,qty:l.qty}))}),signal:controller.signal}).then(r=>r.json()).then(d=>setServerQuote({key:cartKey,total:d.quote?.subtotal??0,stockIssues:d.stockIssues||[]})).catch(()=>{});return()=>controller.abort();},[lines,cartKey]);
  const subtotal = rows.reduce((s, l) => s + (l.product?.variants?.find(v=>v.id===l.variantId)?.price ?? l.product?.price ?? 0) * l.qty, 0);
  const displayedSubtotal=serverSubtotal??subtotal;
  const shipping = displayedSubtotal >= FREE_SHIP_THRESHOLD || displayedSubtotal === 0 ? 0 : FLAT_SHIPPING;
  const stockIssues=serverQuote?.stockIssues??[];
  const quoteLoading=serverSubtotal===null;

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-ink/25 py-16 text-center">
        <p className="font-display text-xl text-ink">{t("empty")}</p>
        <Button asChild className="mt-5">
          <Link href="/collections">{t("continue")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
        {rows.map((l) => (
          <li key={`${l.productSlug}-${l.variantId ?? ""}`} className="flex gap-5 p-5">
            <Link
              href={`/product/${l.productSlug}`}
              className="relative block h-28 w-24 shrink-0 overflow-hidden bg-sand"
            >
              {l.product?.image && (
                <Image src={l.product.image} alt={l.product.title} fill sizes="96px" className="object-cover" />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={`/product/${l.productSlug}`}
                className="truncate text-sm font-medium text-ink hover:text-gold"
              >
                {tx(l.product?.title ?? "", l.product?.titleAr, locale)}
              </Link>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center border border-ink/15">
                  <button
                    className="p-1.5 text-espresso hover:text-ink"
                    aria-label={t("decrease")}
                    onClick={() => setQty(l.productSlug, l.variantId, l.qty - 1)}
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-semibold">{l.qty}</span>
                  <button
                    className="p-1.5 text-espresso hover:text-ink"
                    aria-label={t("increase")}
                    onClick={() => setQty(l.productSlug, l.variantId, l.qty + 1)}
                  >
                    <Plus className="size-3" />
                  </button>
                </span>
                <button
                  className="p-1 text-fog transition hover:text-[#9c2b2e]"
                  aria-label={t("remove")}
                  onClick={() => remove(l.productSlug, l.variantId)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <p className="mt-auto pt-2 font-display text-lg text-ink">
                {formatAED((l.product?.variants?.find(v=>v.id===l.variantId)?.price ?? l.product?.price ?? 0) * l.qty)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit border border-ink/10 bg-white p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-xl text-ink">{t("summary")}</h2>
        <CartStockNotice issues={stockIssues} loading={quoteLoading}/><SamplePicker subtotal={serverSubtotal??0}/><PdpOffers slug="" price={serverSubtotal??0} coupons={[]} locale={locale}/><dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-fog">{t("subtotal")}</dt>
            <dd className="font-medium text-ink">{formatAED(displayedSubtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fog">{t("shipping")}</dt>
            <dd className="font-medium text-ink">
              {shipping === 0 ? t("free") : formatAED(shipping)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-4">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink">
              {t("total")}
            </dt>
            <dd className="font-display text-xl text-ink">{formatAED(displayedSubtotal + shipping)}</dd>
          </div>
        </dl>
        <div className="mt-6"><StockCheckoutGuard issues={stockIssues}>
          {stockIssues.length ? <Button className="w-full" size="lg" disabled>{t("checkout")}</Button> : <Button asChild className="w-full" size="lg"><Link href="/checkout">{t("checkout")}</Link></Button>}
        </StockCheckoutGuard></div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-fog">
          {t("checkoutNote")}
        </p>
      </aside>
    </div>
  );
}

export function TrendingUpsell({ products }: { products: Product[] }) {
  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl text-ink md:text-3xl">
        Complete the Ritual
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
