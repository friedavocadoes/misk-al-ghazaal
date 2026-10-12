"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import Image from "next/image";
import { ShoppingBag, Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { WishHeart } from "./WishHeart";
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

  const addToBag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({ productSlug: product.slug, variantId: product.variants[0]?.id, qty: 1 });
    if (e.currentTarget instanceof HTMLElement) flyToBag(e.currentTarget, primary);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };
  
  const buyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({ productSlug: product.slug, variantId: product.variants[0]?.id, qty: 1 });
    router.push("/checkout");
  };
  
  const onWish = async () => {
    const r = await toggle(product.slug);
    if (r === "login") router.push(`/account/login?next=/product/${product.slug}`);
    return r;
  };

  const wishBtn = () => (
    <WishHeart
      wished={wished}
      onToggle={onWish}
      label={title}
      className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center bg-transparent text-ink/30 transition-all duration-300 hover:scale-105 hover:text-[#9c2b2e]"
      heartClassName="size-4 active:scale-90"
    />
  );

  const badges = (
    <span className="absolute left-4 top-4 z-20 flex flex-col items-start gap-1.5">
      {onSale && (
        <span className="border border-ink/10 bg-white/70 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-[#9c2b2e] backdrop-blur-sm">
          Sale
        </span>
      )}
      {product.isNew && (
        <span className="border border-ink/10 bg-white/70 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-ink backdrop-blur-sm">
          New
        </span>
      )}
    </span>
  );

  // DESKTOP HOVER ACTIONS: Positioned flush at the bottom, sliding up snappily in 300ms.
  const desktopActionBar = (
    <div className="absolute inset-x-0 bottom-0 z-20 hidden translate-y-full gap-2 p-3 transition-transform duration-300 group-hover:translate-y-0 md:flex">
      <button
        onClick={addToBag}
        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border border-ink bg-ink/95 py-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-ink"
      >
        <ShoppingBag className="size-3" />
        {added ? "Added" : "Add to Bag"}
      </button>
      <button
        onClick={buyNow}
        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border border-ink bg-white/95 py-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-ink hover:text-white"
      >
        <Zap className="size-3" />
        Buy Now
      </button>
    </div>
  );

  // MOBILE ACTIONS: Thumb-friendly, statically placed below the price block for touch devices.
  const mobileActions = (
    <div className="mt-4 flex w-full gap-2 md:hidden">
      <button
        onClick={addToBag}
        className="flex flex-1 items-center justify-center gap-1.5 border border-ink py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink transition active:bg-ink active:text-white"
      >
        <ShoppingBag className="size-3.5" />
        {added ? "Added" : "Add"}
      </button>
      <button
        onClick={buyNow}
        className="flex flex-1 items-center justify-center gap-1.5 bg-ink py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition active:bg-ink/80"
      >
        <Zap className="size-3.5" />
        Buy
      </button>
    </div>
  );

  const priceDisplay = (
    <div className="mt-1 flex items-center justify-center gap-2 text-[12px] font-medium tracking-widest text-ink/80">
      <span>AED {product.price.toFixed(2)}</span>
      {onSale && product.compareAtPrice && (
        <s className="text-ink/30">AED {product.compareAtPrice.toFixed(2)}</s>
      )}
    </div>
  );

  if (layoutVariant === "left") {
    return (
      <div className={cn("flex gap-5 bg-transparent", className)}>
        <Link
          href={`/product/${product.slug}`}
          className="relative h-32 w-24 shrink-0 overflow-hidden bg-[#F6F5F3]"
        >
          <Image
            src={primary}
            alt={title}
            fill
            sizes="96px"
            className="object-cover transition duration-500 hover:scale-[1.04]"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
          <Link
            href={`/product/${product.slug}`}
            className="truncate font-display text-[15px] uppercase tracking-wider text-ink transition-colors hover:text-gold-soft"
          >
            {title}
          </Link>
          <div className="mt-1 text-[12px] tracking-wider text-ink/80">
            <span className="font-medium">AED {product.price.toFixed(2)}</span>
            {onSale && product.compareAtPrice && (
              <s className="ml-2 text-ink/30">AED {product.compareAtPrice.toFixed(2)}</s>
            )}
          </div>
          <div className="mt-4 flex gap-1.5">
            <button
              onClick={addToBag}
              className="flex cursor-pointer items-center gap-1.5 border border-ink bg-transparent px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-white"
            >
              <ShoppingBag className="size-3" />
              {added ? "Added" : "Add"}
            </button>
            <button
              onClick={buyNow}
              className="flex cursor-pointer items-center gap-1.5 bg-ink px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-ink/85"
            >
              <Zap className="size-3" />
              Buy
            </button>
          </div>
        </div>
      </div>
    );
  }

  // default: grid with metadata positioned underneath the image card
  return (
    <div className={cn("group relative flex flex-col bg-transparent", className)}>
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F6F5F3]">
        <Link href={`/product/${product.slug}`} aria-label={title} className="absolute inset-0">
          <Image
            src={primary}
            alt={title}
            fill
            sizes="(min-width:1024px) 25vw, 50vw"
            className={cn(
              "object-cover transition duration-500 group-hover:scale-[1.04]",
              secondary && "group-hover:opacity-0"
            )}
            priority
          />
          {secondary && (
            <Image
              src={secondary}
              alt=""
              aria-hidden
              fill
              sizes="(min-width:1024px) 25vw, 50vw"
              className="object-cover opacity-0 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
            />
          )}
        </Link>
        
        {/* Subtle shadow ensuring text reads clearly if sliding over white backgrounds */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 hidden md:block" />

        {badges}
        {wishBtn()}
        {desktopActionBar}
      </div>
      
      {/* Editorial Type Block Below the Frame */}
      <div className="pt-4 text-center">
        <Link
          href={`/product/${product.slug}`}
          className="block font-display text-[15px] uppercase tracking-wider text-ink transition-colors duration-300 hover:text-gold-soft"
        >
          <h3 className="line-clamp-1">{title}</h3>
        </Link>
        {priceDisplay}
        {mobileActions}
      </div>
    </div>
  );
}