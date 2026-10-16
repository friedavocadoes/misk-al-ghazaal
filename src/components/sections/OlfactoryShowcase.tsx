"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowUpRight,
  Check,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Note, Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { pick, tx } from "@/lib/i18n";
import { ALCHEMIST_DEFAULTS, type AlchemistAccord } from "@/lib/site";
import { useCart } from "@/lib/cart";
import { flyToBag } from "@/lib/fly-to-bag";

export interface OlfactoryShowcaseProps {
  products: Product[];
  notes?: Note[];
  eyebrow?: string;
  title?: string;
  prompt?: string;
  /** Optional admin-filtered note slugs from homepage_sections.config.noteSlugs */
  configuredNoteSlugs?: string[];
}

export function OlfactoryShowcase({
  products,
  notes = [],
  eyebrow,
  title,
  prompt,
  configuredNoteSlugs,
}: OlfactoryShowcaseProps) {
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const router = useRouter();
  const { add } = useCart();

  // Merge database notes with centralized ALCHEMIST_DEFAULTS so admin-created
  // notes in /admin/notes work automatically while preserving rich fallbacks.
  const accords: AlchemistAccord[] = useMemo(() => {
    const defaultMap = new Map(
      ALCHEMIST_DEFAULTS.accords.map((a) => [a.slug, a]),
    );

    let list: AlchemistAccord[] = [];

    if (notes.length > 0) {
      list = notes.map((n) => {
        const preset = defaultMap.get(n.slug);
        return {
          slug: n.slug,
          nameEn: n.name,
          nameAr: n.nameAr ?? preset?.nameAr ?? n.name,
          subtitleEn: n.description || preset?.subtitleEn || "Pure Note",
          subtitleAr: n.descriptionAr || preset?.subtitleAr || "نوتة عطرية",
          color: n.color || preset?.color || "#8a6d2f",
          matchSlugs: preset?.matchSlugs ?? [],
          matchKeywords: [
            n.slug.toLowerCase(),
            n.name.toLowerCase(),
            ...(preset?.matchKeywords ?? []),
          ],
        };
      });
    } else {
      list = ALCHEMIST_DEFAULTS.accords;
    }

    if (configuredNoteSlugs && configuredNoteSlugs.length > 0) {
      const bySlug = new Map(list.map((a) => [a.slug, a]));
      const filtered = configuredNoteSlugs
        .map((s) => bySlug.get(s) ?? defaultMap.get(s))
        .filter((x): x is AlchemistAccord => Boolean(x));
      if (filtered.length > 0) return filtered.slice(0, 8);
    }

    return list.slice(0, 6);
  }, [notes, configuredNoteSlugs]);

  // Default to the first accord selected so the customer immediately sees an active blend
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() =>
    accords[0] ? [accords[0].slug] : [],
  );
  const [matchIdx, setMatchIdx] = useState(0);
  const [addedSlug, setAddedSlug] = useState<string | null>(null);

  const toggleAccord = (slug: string) => {
    setMatchIdx(0);
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        // Keep at least 1 selected or allow clearing back to all
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), slug];
      }
      return [...prev, slug];
    });
  };

  const shuffleBlend = () => {
    if (!accords.length) return;
    const shuffled = [...accords].sort(() => Math.random() - 0.5);
    const count = Math.min(2, shuffled.length);
    setSelectedSlugs(shuffled.slice(0, count).map((a) => a.slug));
    setMatchIdx(0);
  };

  // Score and rank products based on selected accords (checks DB product_notes first, then slugs/keywords)
  const matchedProducts = useMemo(() => {
    if (!products.length) return [];
    if (!selectedSlugs.length) return products.slice(0, 4);

    const activeAccords = accords.filter((a) =>
      selectedSlugs.includes(a.slug),
    );

    const scored = products.map((p) => {
      let score = 0;
      const pNoteSlugs = new Set(
        (p.notes ?? []).map((n) => n.slug.toLowerCase()),
      );
      const hay = `${p.slug} ${p.title} ${p.categorySlugs.join(" ")}`.toLowerCase();

      for (const acc of activeAccords) {
        if (pNoteSlugs.has(acc.slug.toLowerCase())) {
          score += 5;
        }
        if (acc.matchSlugs.includes(p.slug)) {
          score += 4;
        }
        for (const kw of acc.matchKeywords) {
          if (kw && hay.includes(kw.toLowerCase())) {
            score += 2;
            break;
          }
        }
      }
      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const positive = scored.filter((s) => s.score > 0).map((s) => s.product);
    return (positive.length > 0 ? positive : products).slice(0, 4);
  }, [products, accords, selectedSlugs]);

  if (!products.length || !accords.length) return null;

  const activeProduct =
    matchedProducts[matchIdx] ?? matchedProducts[0] ?? products[0]!;
  const productTitle = tx(activeProduct.title, activeProduct.titleAr, locale);
  const [primaryImg, secondaryImg] = activeProduct.images;
  const activeAccords = accords.filter((a) => selectedSlugs.includes(a.slug));

  // Dynamic ambient radial aura blended from the selected accord hex colors
  const c1 = activeAccords[0]?.color ?? "#b3924a";
  const c2 = activeAccords[1]?.color ?? c1;
  const c3 = activeAccords[2]?.color ?? c2;

  const handleAddToBag = (e: React.MouseEvent<HTMLButtonElement>) => {
    add({
      productSlug: activeProduct.slug,
      variantId: activeProduct.variants[0]?.id,
      qty: 1,
    });
    if (primaryImg) flyToBag(e.currentTarget, primaryImg);
    setAddedSlug(activeProduct.slug);
    setTimeout(() => setAddedSlug(null), 1500);
  };

  const handleBuyNow = () => {
    add({
      productSlug: activeProduct.slug,
      variantId: activeProduct.variants[0]?.id,
      qty: 1,
    });
    router.push("/checkout");
  };

  return (
    <section
      aria-label={
        title || pick(ALCHEMIST_DEFAULTS.title, locale)
      }
      className="maison-stage relative overflow-hidden border-b border-ink/10 py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {/* Minimalist Header */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow flex items-center gap-3 text-gold">
              <span className="inline-block h-px w-8 bg-gold" />
              {eyebrow || pick(ALCHEMIST_DEFAULTS.eyebrow, locale)}
            </p>
            <h2 className="mt-2.5 font-display text-3xl leading-tight text-ink md:text-5xl">
              {title || pick(ALCHEMIST_DEFAULTS.title, locale)}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={shuffleBlend}
              className="inline-flex cursor-pointer items-center gap-2 border border-ink/15 bg-cream px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:border-gold hover:bg-gold-wash"
            >
              <Sparkles className="size-3.5 text-gold" />
              {pick(ALCHEMIST_DEFAULTS.shuffleLabel, locale)}
            </button>
            {selectedSlugs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSlugs([]);
                  setMatchIdx(0);
                }}
                aria-label={pick(ALCHEMIST_DEFAULTS.resetLabel, locale)}
                className="inline-flex cursor-pointer items-center gap-1.5 border border-ink/15 bg-transparent px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-fog transition hover:border-ink/40 hover:text-ink"
              >
                <RotateCcw className="size-3" />
                {pick(ALCHEMIST_DEFAULTS.resetLabel, locale)}
              </button>
            )}
          </div>
        </div>

        {/* Interactive 2-Column Alchemist Stage */}
        <div className="grid items-stretch gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* LEFT: Tactile Accord Constellation (Tap up to 3) */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-espresso">
                  {prompt || pick(ALCHEMIST_DEFAULTS.prompt, locale)}
                </p>
                <span className="font-display text-xs italic text-gold">
                  {selectedSlugs.length} / 3
                </span>
              </div>

              {/* 6 Interactive Accord Orbs */}
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                {accords.map((accord) => {
                  const selIndex = selectedSlugs.indexOf(accord.slug);
                  const isSelected = selIndex !== -1;

                  return (
                    <button
                      key={accord.slug}
                      type="button"
                      onClick={() => toggleAccord(accord.slug)}
                      aria-pressed={isSelected}
                      className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border p-5 text-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isSelected
                          ? "border-gold bg-cream shadow-[0_20px_40px_-20px_rgba(138,109,47,0.35)] -translate-y-0.5"
                          : "border-ink/10 bg-cream/65 hover:border-gold/45 hover:bg-cream"
                      }`}
                    >
                      {/* Selection order badge */}
                      {isSelected && (
                        <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-ink font-display text-[10px] italic text-gold-soft">
                          0{selIndex + 1}
                        </span>
                      )}

                      {/* Glowing Olfactory Sphere */}
                      <span className="relative flex size-14 items-center justify-center">
                        <span
                          aria-hidden
                          className={`absolute inset-0 rounded-full transition-transform duration-700 ${
                            isSelected
                              ? "scale-125 opacity-35"
                              : "scale-90 opacity-15 group-hover:scale-110 group-hover:opacity-25"
                          }`}
                          style={{
                            background: `radial-gradient(circle, ${accord.color} 0%, transparent 72%)`,
                          }}
                        />
                        <span
                          className={`relative size-7 rounded-full border transition-transform duration-500 ${
                            isSelected
                              ? "scale-110 border-gold ring-4 ring-gold/20"
                              : "border-ink/20 group-hover:scale-105"
                          }`}
                          style={{
                            background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${accord.color} 55%, #1c1917 100%)`,
                          }}
                        />
                      </span>

                      <span className="mt-3 block font-display text-base text-ink">
                        {locale === "ar" ? accord.nameAr : accord.nameEn}
                      </span>
                      <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-fog">
                        {locale === "ar"
                          ? accord.subtitleAr
                          : accord.subtitleEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Harmony Blend Bar */}
            <div className="mt-6 flex items-center justify-between border border-ink/10 bg-cream/90 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">
                  {locale === "ar" ? "مزيجك:" : "Your Harmony:"}
                </span>
                {activeAccords.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeAccords.map((a) => (
                      <span
                        key={a.slug}
                        className="inline-flex items-center gap-1.5 border border-gold/30 bg-gold-wash/50 px-2.5 py-1 text-[11px] font-medium text-ink"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: a.color }}
                        />
                        {locale === "ar" ? a.nameAr : a.nameEn}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs italic text-fog">
                    {locale === "ar"
                      ? "جميع ابتكارات الدار"
                      : "Showing House Icons"}
                  </span>
                )}
              </div>

              {/* Match Switcher Dots when multiple perfumes match */}
              {matchedProducts.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {matchedProducts.map((mp, idx) => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setMatchIdx(idx)}
                      aria-label={`Match ${idx + 1}`}
                      className={`cursor-pointer px-2 py-1 font-display text-xs transition ${
                        idx === matchIdx
                          ? "border-b-2 border-gold font-semibold text-ink"
                          : "text-fog hover:text-ink"
                      }`}
                    >
                      0{idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live-Morphing Alchemist Plinth & Instant Purchase */}
          <div
            key={activeProduct.slug + selectedSlugs.join("-")}
            className="animate-luxury-reveal relative flex flex-col justify-between overflow-hidden border border-ink/10 bg-cream p-6 md:p-8"
          >
            {/* Dynamic Color-Blended Aura Backdrop driven by selected accords */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-25 transition-all duration-1000"
              style={{
                background: `radial-gradient(circle at 30% 35%, ${c1} 0%, transparent 55%), radial-gradient(circle at 75% 65%, ${c2} 0%, transparent 55%), radial-gradient(circle at 50% 50%, ${c3} 0%, transparent 65%)`,
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-3 border border-gold/25"
            />

            {/* Top Plinth Bar */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
                <Sparkles className="size-3" />
                {pick(ALCHEMIST_DEFAULTS.matchLabel, locale)}
              </span>
              {activeProduct.variants[0]?.title && (
                <span className="border border-ink/15 bg-cream/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
                  {activeProduct.variants[0].title}
                </span>
              )}
            </div>

            {/* Center Bottle + Product Details */}
            <div className="relative z-10 my-6 grid items-center gap-6 sm:grid-cols-[200px_1fr]">
              <Link
                href={`/product/${activeProduct.slug}`}
                className="group relative mx-auto block aspect-square w-44 sm:w-full"
              >
                {primaryImg && (
                  <Image
                    src={primaryImg}
                    alt={productTitle}
                    fill
                    sizes="220px"
                    className={`object-contain p-2 mix-blend-multiply transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 ${
                      secondaryImg ? "group-hover:opacity-0" : ""
                    }`}
                  />
                )}
                {secondaryImg && (
                  <Image
                    src={secondaryImg}
                    alt=""
                    aria-hidden
                    fill
                    sizes="220px"
                    className="object-contain p-2 opacity-0 mix-blend-multiply transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-100"
                  />
                )}
              </Link>

              <div className="text-center sm:text-left rtl:sm:text-right">
                <Link
                  href={`/product/${activeProduct.slug}`}
                  className="font-display text-2xl leading-snug text-ink transition hover:text-gold md:text-3xl"
                >
                  {productTitle}
                </Link>

                <div className="mt-2 flex items-baseline justify-center gap-2.5 sm:justify-start">
                  <span className="font-display text-xl text-ink">
                    AED {activeProduct.price.toFixed(2)}
                  </span>
                  {activeProduct.compareAtPrice &&
                    activeProduct.compareAtPrice > activeProduct.price && (
                      <s className="text-xs text-fog">
                        AED {activeProduct.compareAtPrice.toFixed(2)}
                      </s>
                    )}
                </div>

                {/* Display product's own notes if present, otherwise active accords */}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {(activeProduct.notes?.length
                    ? activeProduct.notes.slice(0, 4).map((n) => ({
                        key: n.id,
                        label: tx(n.name, n.nameAr, locale),
                        color: n.color,
                      }))
                    : activeAccords.map((a) => ({
                        key: a.slug,
                        label: locale === "ar" ? a.nameAr : a.nameEn,
                        color: a.color,
                      }))
                  ).map((pill) => (
                    <span
                      key={pill.key}
                      className="inline-flex items-center gap-1.5 border border-ink/10 bg-cream/90 px-2.5 py-1 text-[10.5px] font-medium text-espresso"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: pill.color }}
                      />
                      {pill.label}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                  <button
                    type="button"
                    onClick={handleAddToBag}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 border border-ink bg-ink px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-gold hover:bg-gold"
                  >
                    {addedSlug === activeProduct.slug ? (
                      <>
                        <Check className="size-3.5" />
                        {locale === "ar" ? "أُضيفت" : "Added"}
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="size-3.5" />
                        {locale === "ar" ? "أضف للسلة" : "Add to Bag"}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 border border-ink bg-cream px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:bg-gold-wash"
                  >
                    <Zap className="size-3.5 text-gold" />
                    {locale === "ar" ? "اشترِ" : "Buy"}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Quick Switcher Strip */}
            <div className="relative z-10 flex items-center justify-between border-t border-ink/10 pt-4">
              <div className="flex items-center gap-2">
                {matchedProducts.map((mp, idx) => {
                  const isCurr = idx === matchIdx;
                  return (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setMatchIdx(idx)}
                      className={`relative size-10 cursor-pointer overflow-hidden border bg-white transition-all ${
                        isCurr
                          ? "border-gold ring-1 ring-gold/40"
                          : "border-ink/10 opacity-55 hover:opacity-100"
                      }`}
                      title={tx(mp.title, mp.titleAr, locale)}
                    >
                      {mp.images[0] && (
                        <Image
                          src={mp.images[0]}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <Link
                href={`/product/${activeProduct.slug}`}
                className="group inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:text-gold"
              >
                <span>{pick(ALCHEMIST_DEFAULTS.viewDossierLabel, locale)}</span>
                <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
