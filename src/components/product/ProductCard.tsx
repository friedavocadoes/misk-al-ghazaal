"use client";

import { productAvailable, defaultVariant } from "@/lib/product-options";
import { useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { Check, ShoppingBag, Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { WishHeart } from "./WishHeart";
import { haptic } from "@/lib/haptics";
import { flyToBag } from "@/lib/fly-to-bag";

export function ProductCard({
  product,
  layoutVariant = "grid",
  className,
}: {
  product: Product;
  layoutVariant?: "grid" | "style2" | "left";
  className?: string;
}) {
  const router = useRouter();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const title = tx(product.title, product.titleAr, locale);
  const [primary, secondary] = product.images;
  const wished = has(product.slug);
  const onSale =
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > product.price;

  const available=productAvailable(product);
  const multiple=product.variants.length>1;
  const firstVariant=defaultVariant(product);
  const variantLabel = firstVariant?.title;
  const previewNotes = product.notes?.slice(0, 3) ?? [];

  const addToBag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(!available)return;
    if(multiple){haptic("selection");router.push(`/product/${product.slug}`);return;}
    add({
      productSlug: product.slug,
      variantId: firstVariant?.id,
      qty: 1,
    }, "flight");
    if (e.currentTarget instanceof HTMLElement) {
      flyToBag(e.currentTarget, primary);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const buyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(!available)return;
    if(multiple){haptic("selection");router.push(`/product/${product.slug}`);return;}
    add({
      productSlug: product.slug,
      variantId: firstVariant?.id,
      qty: 1,
    });
    router.push("/checkout");
  };

  const onWish = async () => {
    const r = await toggle(product.slug);
    if (r === "login")
      router.push(`/account/login?next=/product/${product.slug}`);
    return r;
  };

  const wishBtn = () => (
    <WishHeart
      wished={wished}
      onToggle={onWish}
      label={title}
      className="absolute right-3.5 top-3.5 z-20 flex size-8 items-center justify-center rounded-full bg-cream/80 text-ink/40 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-cream hover:text-[#9c2b2e]"
      heartClassName="size-4 active:scale-90"
    />
  );

  const badges = (
    <span className="absolute left-3.5 top-3.5 z-20 flex flex-col items-start gap-1.5">
      {!available && <span className="border border-red-200 bg-white/95 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-red-800">{locale==="ar"?"نفد المخزون":"Out of stock"}</span>}
      {onSale && (
        <span className="border border-[#9c2b2e]/25 bg-cream/90 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-[#9c2b2e] backdrop-blur-sm">
          {locale === "ar" ? "عرض" : "Sale"}
        </span>
      )}
      {product.isNew && (
        <span className="border border-gold/35 bg-cream/90 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-gold backdrop-blur-sm">
          {locale === "ar" ? "جديد" : "New"}
        </span>
      )}
      {!product.isNew && product.isBestSeller && (
        <span className="border border-ink/15 bg-cream/90 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-ink backdrop-blur-sm">
          {locale === "ar" ? "أيقونة" : "Best Seller"}
        </span>
      )}
    </span>
  );

  // DESKTOP HOVER ACTIONS: Silky cubic-bezier slide-up bar inside the pedestal frame
  const desktopActionBar = (
    <div className=" absolute inset-x-0 bottom-0 z-20 hidden translate-y-full gap-1.5 bg-gradient-to-t from-cream/95 via-cream/90 to-transparent p-3 pt-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 md:flex">
      <button data-ios-haptic="on"
        disabled={!available} aria-label={!available ? (locale==="ar"?"نفد المخزون":"Out of stock") : undefined}
        onClick={addToBag}
        className="flex flex-1 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer items-center justify-center gap-1.5 border border-ink bg-ink py-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-gold hover:bg-gold"
      >
        {added ? <Check className="size-3" /> : <ShoppingBag className="size-3" />}
        {multiple ? (locale==="ar"?"اختر الخيارات":"Choose options") : added
          ? locale === "ar"
            ? "أُضيفت"
            : "Added"
          : locale === "ar"
            ? "أضف للسلة"
            : "Add to Bag"}
      </button>
      <button data-ios-haptic="on"
        disabled={!available}
        onClick={buyNow}
        className="flex flex-1 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer items-center justify-center gap-1.5 border border-ink/80 bg-cream/95 py-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:border-gold hover:bg-gold-wash"
      >
        <Zap className="size-3 text-gold" />
        {locale === "ar" ? "اشترِ الآن" : "Buy Now"}
      </button>
    </div>
  );

  // MOBILE ACTIONS: Clean hairline pair below the price block
  const mobileActions = (
    <div className="mt-3.5 flex w-full gap-1.5 md:hidden">
      <button data-ios-haptic="on"
        disabled={!available} aria-label={!available ? (locale==="ar"?"نفد المخزون":"Out of stock") : undefined}
        onClick={addToBag}
        className="flex flex-1 disabled:cursor-not-allowed disabled:opacity-40 items-center justify-center gap-1.5 border border-ink/80 bg-transparent py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink transition active:bg-ink active:text-white"
      >
        <ShoppingBag className="size-3" />
        {multiple ? (locale==="ar"?"الخيارات":"Options") : added
          ? locale === "ar"
            ? "أُضيفت"
            : "Added"
          : locale === "ar"
            ? "أضف"
            : "Add"}
      </button>
      <button data-ios-haptic="on"
        disabled={!available}
        onClick={buyNow}
        className="flex flex-1 disabled:cursor-not-allowed disabled:opacity-40 items-center justify-center gap-1.5 bg-ink py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white transition active:bg-gold"
      >
        <Zap className="size-3 text-gold-soft" />
        {locale === "ar" ? "اشترِ" : "Buy"}
      </button>
    </div>
  );

  if (layoutVariant === "left") {
    return (
      <div className={cn("flex gap-5 bg-transparent", className)}>
        <Link
          href={`/product/${product.slug}`}
          className="flacon-pedestal relative h-32 w-24 shrink-0 overflow-hidden border border-ink/10"
        >
          <Image
            src={primary}
            alt={title}
            fill
            sizes="96px"
            className="object-contain p-2 mix-blend-multiply transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.06]"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
          <Link
            href={`/product/${product.slug}`}
            className="truncate font-display text-[15px] uppercase tracking-wider text-ink transition-colors hover:text-gold"
          >
            {title}
          </Link>
          {!available && <span className="mt-1 text-xs text-red-700">{locale==="ar"?"نفد المخزون":"Out of stock"}</span>}
          <div className="mt-1 text-[12px] tracking-wider text-ink/80">
            <span className="font-medium">{multiple && "From "}AED {product.price.toFixed(2)}</span>
            {onSale && product.compareAtPrice && (
              <s className="ml-2 text-ink/35">
                AED {product.compareAtPrice.toFixed(2)}
              </s>
            )}
          </div>
          <div className="mt-4 flex gap-1.5">
            <button
              disabled={!available} aria-label={!available ? (locale==="ar"?"نفد المخزون":"Out of stock") : undefined}
        onClick={addToBag}
              className="flex cursor-pointer items-center gap-1.5 border border-ink bg-transparent px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-white"
            >
              <ShoppingBag className="size-3" />
              {multiple ? "Options" : added ? "Added" : "Add"}
            </button>
            <button
              disabled={!available}
        onClick={buyNow}
              className="flex cursor-pointer items-center gap-1.5 bg-ink px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gold"
            >
              <Zap className="size-3" />
              Buy
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-transparent",
        className,
      )}
    >
      {/* Museum Plinth Image Frame */}
      <div className="flacon-pedestal relative aspect-[3/4] overflow-hidden border border-ink/[0.08] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-gold/45 group-hover:shadow-[0_24px_48px_-24px_rgba(28,25,23,0.16)]">
        <Link
          href={`/product/${product.slug}`}
          aria-label={title}
          className="absolute inset-0"
        >
          <Image
            src={primary}
            alt={title}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className={cn(
              "object-cover transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]",
              secondary && "group-hover:opacity-0",
            )}
          />
          {secondary && (
            <Image
              src={secondary}
              alt=""
              aria-hidden
              fill
              sizes="(min-width:1024px) 25vw, 50vw"
              className="object-cover opacity-0 transition-all duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] group-hover:opacity-100"
            />
          )}
        </Link>

        {badges}
        {wishBtn()}
        {desktopActionBar}
      </div>

      {/* Editorial Caption Block Below the Frame */}
      <div className="pt-4 text-center">
        {/* Olfactory Notes or Lineup Micro-Caption */}
        {previewNotes.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] tracking-[0.14em] text-fog">
            {previewNotes.map((n) => (
              <span key={n.id} className="inline-flex items-center gap-1">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: n.color }}
                />
                <span className="truncate max-w-[72px]">
                  {tx(n.name, n.nameAr, locale)}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-gold/85">
            {tx(
              product.lineupTitle ?? variantLabel ?? "Maison Creation",
              product.lineupTitleAr,
              locale,
            )}
          </p>
        )}

        <Link
          href={`/product/${product.slug}`}
          className="block font-display text-[16px] leading-snug tracking-wide text-ink transition-colors duration-300 hover:text-gold"
        >
          <h3 className="line-clamp-1">{title}</h3>
        </Link>

        <div className="mt-1.5 flex items-center justify-center gap-2 text-[12px] font-medium tracking-[0.14em] text-espresso">
          <span>{multiple && <small className="me-1 text-[10px] text-fog">{locale==="ar"?"من":"From"}</small>}AED {product.price.toFixed(2)}</span>
          {onSale && product.compareAtPrice && (
            <s className="text-fog/60">
              AED {product.compareAtPrice.toFixed(2)}
            </s>
          )}
        </div>

        {mobileActions}
      </div>
    </div>
  );
}