"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import type { Note, Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { pick, tx } from "@/lib/i18n";
import { ALCHEMIST_DEFAULTS } from "@/lib/site";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { useCart } from "@/lib/cart";
import { flyToBag } from "@/lib/fly-to-bag";

export interface OlfactoryShowcaseProps {
  products: Product[];
  notes?: Note[];
  eyebrow?: string;
  title?: string;
  prompt?: string;
  configuredNoteSlugs?: string[];
}

const NOTES_PER_PAGE = 9;

export function OlfactoryShowcase({
  products,
  notes = [],
  eyebrow,
  title,
  prompt,
  configuredNoteSlugs,
}: OlfactoryShowcaseProps) {
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const isAr = locale === "ar";
  const router = useRouter();
  const { add } = useCart();

  // Count how many active products actually carry each note in `product.notes`
  const noteProductCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const seen = new Set<string>();
      for (const pn of p.notes ?? []) {
        const key = pn.slug.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [products]);

  // Build note list strictly from DB (`notes` + `product.notes`), sorting notes
  // that already have linked products first.
  const allNotes: Note[] = useMemo(() => {
    const map = new Map<string, Note>();
    for (const n of notes) {
      map.set(n.slug.toLowerCase(), n);
    }
    for (const p of products) {
      for (const pn of p.notes ?? []) {
        const key = pn.slug.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: pn.id,
            slug: pn.slug,
            name: pn.name,
            nameAr: pn.nameAr,
            color: pn.color,
            glyph: pn.glyph,
            description: pn.description,
            descriptionAr: pn.descriptionAr,
          });
        }
      }
    }

    let list = Array.from(map.values());

    if (configuredNoteSlugs && configuredNoteSlugs.length > 0) {
      const orderMap = new Map(
        configuredNoteSlugs.map((s, idx) => [s.toLowerCase(), idx]),
      );
      const pinned = list
        .filter((n) => orderMap.has(n.slug.toLowerCase()))
        .sort(
          (a, b) =>
            (orderMap.get(a.slug.toLowerCase()) ?? 999) -
            (orderMap.get(b.slug.toLowerCase()) ?? 999),
        );
      if (pinned.length > 0) return pinned;
    }

    return list.sort((a, b) => {
      const ca = noteProductCounts.get(a.slug.toLowerCase()) ?? 0;
      const cb = noteProductCounts.get(b.slug.toLowerCase()) ?? 0;
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name);
    });
  }, [notes, products, configuredNoteSlugs, noteProductCounts]);

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [matchIdx, setMatchIdx] = useState(0);
  const [addedSlug, setAddedSlug] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allNotes;
    return allNotes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        (n.nameAr && n.nameAr.includes(q)) ||
        (n.description && n.description.toLowerCase().includes(q)) ||
        n.slug.toLowerCase().includes(q),
    );
  }, [allNotes, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotes.length / NOTES_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const visibleNotes = filteredNotes.slice(
    safePage * NOTES_PER_PAGE,
    (safePage + 1) * NOTES_PER_PAGE,
  );

  const toggleNote = (slug: string) => {
    const norm = slug.toLowerCase();
    setMatchIdx(0);
    setSelectedSlugs((prev) => {
      if (prev.includes(norm)) {
        return prev.filter((s) => s !== norm);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), norm];
      }
      return [...prev, norm];
    });
  };

  const handleSurpriseMe = () => {
    if (!allNotes.length) return;
    const populated = allNotes.filter(
      (n) => (noteProductCounts.get(n.slug.toLowerCase()) ?? 0) > 0,
    );
    const pool = populated.length > 0 ? populated : allNotes;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const pickCount = Math.min(2, shuffled.length);
    setSelectedSlugs(
      shuffled.slice(0, pickCount).map((n) => n.slug.toLowerCase()),
    );
    setMatchIdx(0);
  };

  // STRICT DATABASE NOTE MATCHING (Zero hardcoded or fake fallback matches)
  const { matchedItems, isStrictMatch } = useMemo(() => {
    if (!selectedSlugs.length) {
      return {
        matchedItems: products
          .slice(0, 6)
          .map((product) => ({ product, matchedNoteSlugs: [] as string[] })),
        isStrictMatch: false,
      };
    }

    const strict: { product: Product; matchedNoteSlugs: string[] }[] = [];
    for (const p of products) {
      const pNotes = (p.notes ?? []).map((n) => n.slug.toLowerCase());
      const hits = selectedSlugs.filter((s) => pNotes.includes(s));
      if (hits.length > 0) {
        strict.push({ product: p, matchedNoteSlugs: hits });
      }
    }

    strict.sort((a, b) => b.matchedNoteSlugs.length - a.matchedNoteSlugs.length);
    return {
      matchedItems: strict.slice(0, 6),
      isStrictMatch: true,
    };
  }, [products, selectedSlugs]);

  if (!products.length || !allNotes.length) return null;

  const selectedNoteObjects = selectedSlugs
    .map((s) => allNotes.find((n) => n.slug.toLowerCase() === s))
    .filter((n): n is Note => Boolean(n));

  const activeEntry = matchedItems[matchIdx] ?? matchedItems[0] ?? null;
  const activeProduct = activeEntry?.product ?? null;
  const matchedNoteSlugs = activeEntry?.matchedNoteSlugs ?? [];

  const handleAddToBag = (
    e: React.MouseEvent<HTMLButtonElement>,
    product: Product,
  ) => {
    add({
      productSlug: product.slug,
      variantId: product.variants[0]?.id,
      qty: 1,
    });
    if (product.images[0]) flyToBag(e.currentTarget, product.images[0]);
    setAddedSlug(product.slug);
    setTimeout(() => setAddedSlug(null), 1500);
  };

  const handleBuyNow = (product: Product) => {
    add({
      productSlug: product.slug,
      variantId: product.variants[0]?.id,
      qty: 1,
    });
    router.push("/checkout");
  };

  return (
    <section
      aria-label={title || pick(ALCHEMIST_DEFAULTS.title, locale)}
      className="relative overflow-hidden border-b border-ink/10 bg-cream py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow flex items-center gap-3 text-gold">
              <span className="inline-block h-px w-8 bg-gold" />
              {eyebrow || pick(ALCHEMIST_DEFAULTS.eyebrow, locale)}
            </p>
            <h2 className="mt-2.5 font-display text-3xl leading-tight text-ink md:text-5xl">
              {title || pick(ALCHEMIST_DEFAULTS.title, locale)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="group inline-flex cursor-pointer items-center gap-2 border border-gold/40 bg-gold-wash/60 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink transition-all duration-300 hover:border-gold hover:bg-gold hover:text-white"
            >
              <Sparkles className="size-3.5 text-gold transition-colors group-hover:text-white" />
              {pick(ALCHEMIST_DEFAULTS.shuffleLabel, locale)}
            </button>
            {selectedSlugs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSlugs([]);
                  setMatchIdx(0);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 border border-ink/15 bg-white px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-espresso transition hover:border-ink/40 hover:text-ink"
              >
                <RotateCcw className="size-3" />
                {pick(ALCHEMIST_DEFAULTS.resetLabel, locale)}
              </button>
            )}
          </div>
        </div>

        <div className="border border-ink/12 bg-sand/45 p-2 shadow-[0_32px_80px_-38px_rgba(28,25,23,0.16)] md:p-3.5">
          <div className="grid items-stretch gap-3.5 lg:grid-cols-12">
            {/* LEFT PANEL (7 Cols): The Glyph & Note Atelier */}
            <div className="flex flex-col justify-between border border-ink/10 bg-cream p-5 md:p-7 lg:col-span-7">
              <div>
                <div className="mb-5 flex flex-col gap-3 border-b border-ink/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-gold-soft">
                      {selectedSlugs.length}/3
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-espresso">
                      {prompt || pick(ALCHEMIST_DEFAULTS.prompt, locale)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {allNotes.length > 6 && (
                      <div className="relative flex items-center">
                        <Search className="pointer-events-none absolute left-2.5 size-3.5 text-fog rtl:left-auto rtl:right-2.5" />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(0);
                          }}
                          placeholder={
                            isAr
                              ? `ابحث في ${allNotes.length} نوتة…`
                              : `Filter ${allNotes.length} notes…`
                          }
                          className="h-8 w-38 border border-ink/15 bg-white pl-8 pr-6 text-xs text-ink placeholder:text-fog focus:border-gold focus:outline-none sm:w-44 rtl:pl-6 rtl:pr-8"
                        />
                        {query && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setPage(0);
                            }}
                            aria-label="Clear search"
                            className="absolute right-2 cursor-pointer text-fog hover:text-ink rtl:left-2 rtl:right-auto"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={safePage === 0}
                          aria-label="Previous notes page"
                          className="flex size-8 cursor-pointer items-center justify-center border border-ink/15 bg-white text-ink transition hover:border-gold disabled:opacity-30"
                        >
                          <ArrowLeft className="size-3.5 rtl:rotate-180" />
                        </button>
                        <span className="px-1.5 font-mono text-[10px] text-fog">
                          {safePage + 1}/{totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPage((p) => Math.min(totalPages - 1, p + 1))
                          }
                          disabled={safePage >= totalPages - 1}
                          aria-label="Next notes page"
                          className="flex size-8 cursor-pointer items-center justify-center border border-ink/15 bg-white text-ink transition hover:border-gold disabled:opacity-30"
                        >
                          <ArrowRight className="size-3.5 rtl:rotate-180" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {visibleNotes.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center border border-dashed border-ink/15 bg-sand/30 p-6 text-center">
                    <p className="font-display text-lg text-ink">
                      {isAr ? "لا توجد نوتات مطابقة" : "No notes match that filter"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="mt-2 text-xs font-semibold uppercase tracking-widest text-gold underline"
                    >
                      {isAr ? "عرض كل النوتات" : "Show all notes"}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleNotes.map((note) => {
                      const normSlug = note.slug.toLowerCase();
                      const selIdx = selectedSlugs.indexOf(normSlug);
                      const isSelected = selIdx !== -1;
                      const linkedCount = noteProductCounts.get(normSlug) ?? 0;
                      const noteName = tx(note.name, note.nameAr, locale);
                      const noteDesc = tx(
                        note.description ?? "",
                        note.descriptionAr,
                        locale,
                      );

                      return (
                        <button
                          key={note.id || note.slug}
                          type="button"
                          onClick={() => toggleNote(note.slug)}
                          aria-pressed={isSelected}
                          className={`group relative flex cursor-pointer items-center gap-3.5 overflow-hidden border p-3.5 text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] rtl:text-right ${
                            isSelected
                              ? "border-gold bg-white shadow-[0_14px_30px_-14px_rgba(138,109,47,0.28)] ring-1 ring-gold/40"
                              : "border-ink/10 bg-white/75 hover:border-gold/50 hover:bg-white"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`absolute inset-x-0 top-0 h-[2px] transition-opacity duration-300 ${
                              isSelected
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-60"
                            }`}
                            style={{ backgroundColor: note.color }}
                          />

                          <span
                            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border transition-transform duration-300 group-hover:scale-105"
                            style={{
                              backgroundColor: `${note.color}16`,
                              borderColor: isSelected
                                ? note.color
                                : `${note.color}45`,
                            }}
                          >
                            <NoteGlyph
                              glyph={note.glyph}
                              className="size-4.5 transition-transform duration-300 group-hover:scale-110"
                              style={{ color: note.color }}
                            />
                            <span
                              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-white"
                              style={{ backgroundColor: note.color }}
                            />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-1">
                              <span className="truncate font-display text-[15px] font-medium text-ink">
                                {noteName}
                              </span>
                              {isSelected ? (
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[9.5px] font-bold text-gold-soft">
                                  0{selIdx + 1}
                                </span>
                              ) : (
                                linkedCount > 0 && (
                                  <span className="shrink-0 text-[9.5px] font-medium text-fog/80">
                                    {linkedCount}
                                  </span>
                                )
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-[10.5px] text-fog">
                              {noteDesc ||
                                (linkedCount > 0
                                  ? isAr
                                    ? `${linkedCount} عطور`
                                    : `${linkedCount} ${
                                        linkedCount === 1
                                          ? "creation"
                                          : "creations"
                                      }`
                                  : isAr
                                    ? "نوتة عطرية"
                                    : "Olfactory Note")}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">
                    {isAr ? "التركيبة المختارة:" : "Active Accord:"}
                  </span>
                  {selectedNoteObjects.length === 0 ? (
                    <span className="text-xs italic text-fog">
                      {isAr
                        ? "اختر أي نوتة من الأعلى لبدء المطابقة"
                        : "Select any note above to filter perfumes"}
                    </span>
                  ) : (
                    selectedNoteObjects.map((n, i) => (
                      <span key={n.slug} className="inline-flex items-center gap-2">
                        {i > 0 && (
                          <span className="font-display text-xs italic text-gold">
                            +
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleNote(n.slug)}
                          className="inline-flex cursor-pointer items-center gap-1.5 border border-gold/40 bg-gold-wash/50 px-2.5 py-1 text-xs font-medium text-ink transition hover:border-ink/40"
                        >
                          <NoteGlyph
                            glyph={n.glyph}
                            className="size-3"
                            style={{ color: n.color }}
                          />
                          <span>{tx(n.name, n.nameAr, locale)}</span>
                          <X className="size-3 text-fog" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {isStrictMatch && (
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold">
                    {matchedItems.length}{" "}
                    {isAr
                      ? "تطابق"
                      : matchedItems.length === 1
                        ? "Match Found"
                        : "Matches Found"}
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT PANEL (5 Cols): Architectural Portrait Showcase Card */}
            <div className="flex flex-col justify-between border border-ink/10 bg-white lg:col-span-5">
              {!activeProduct ? (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center">
                  <div className="flex items-center gap-2">
                    {selectedNoteObjects.map((n) => (
                      <span
                        key={n.slug}
                        className="flex size-12 items-center justify-center rounded-full border"
                        style={{
                          backgroundColor: `${n.color}16`,
                          borderColor: `${n.color}55`,
                        }}
                      >
                        <NoteGlyph
                          glyph={n.glyph}
                          className="size-5"
                          style={{ color: n.color }}
                        />
                      </span>
                    ))}
                  </div>
                  <p className="eyebrow mt-6 text-gold">
                    {isAr ? "قيد الفهرسة العطرية" : "Olfactory Archive"}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-ink">
                    {isAr
                      ? "لم يُربط عطر بهذه النوتة بعد"
                      : "No creation linked to this note yet"}
                  </h3>
                  <p className="mt-2 max-w-xs text-xs leading-relaxed text-fog">
                    {isAr
                      ? "جرب اختيار نوتة أخرى أو امسح التصفية لاستكشاف أيقونات الدار."
                      : "Assign this note to a perfume in /admin/products, or clear the filter to browse our signature creations."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlugs([]);
                      setMatchIdx(0);
                    }}
                    className="mt-6 cursor-pointer border border-ink bg-ink px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-gold"
                  >
                    {isAr ? "عرض أيقونات الدار" : "View Signature Creations"}
                  </button>
                </div>
              ) : (
                <div
                  key={activeProduct.slug + selectedSlugs.join(",")}
                  className="animate-luxury-reveal flex h-full flex-col justify-between"
                >
                  <div className="group relative aspect-[4/3.6] w-full overflow-hidden border-b border-ink/10 bg-[#F6F5F3]">
                    <Link
                      href={`/product/${activeProduct.slug}`}
                      className="absolute inset-0 block"
                    >
                      {activeProduct.images[0] && (
                        <Image
                          src={activeProduct.images[0]}
                          alt={tx(
                            activeProduct.title,
                            activeProduct.titleAr,
                            locale,
                          )}
                          fill
                          sizes="(min-width:1024px) 480px, 100vw"
                          className={`object-cover object-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 ${
                            activeProduct.images[1]
                              ? "group-hover:opacity-0"
                              : ""
                          }`}
                        />
                      )}
                      {activeProduct.images[1] && (
                        <Image
                          src={activeProduct.images[1]}
                          alt=""
                          aria-hidden
                          fill
                          sizes="(min-width:1024px) 480px, 100vw"
                          className="object-cover object-center opacity-0 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-100"
                        />
                      )}
                    </Link>

                    <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 border border-ink/10 bg-cream/90 px-3 py-1.5 backdrop-blur-md">
                      <Sparkles className="size-3 text-gold" />
                      <span className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-ink">
                        {isStrictMatch
                          ? isAr
                            ? `تطابق ${matchedNoteSlugs.length} / ${selectedSlugs.length} نوتات`
                            : `${matchedNoteSlugs.length} / ${selectedSlugs.length} Notes Matched`
                          : pick(ALCHEMIST_DEFAULTS.matchLabel, locale)}
                      </span>
                    </div>

                    {activeProduct.variants[0]?.title && (
                      <span className="pointer-events-none absolute right-4 top-4 z-10 border border-ink/10 bg-cream/90 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-ink backdrop-blur-md">
                        {activeProduct.variants[0].title}
                      </span>
                    )}

                    {matchedItems.length > 1 && (
                      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 border border-ink/10 bg-cream/90 p-1 backdrop-blur-md">
                          {matchedItems.map((entry, idx) => (
                            <button
                              key={entry.product.id}
                              type="button"
                              onClick={() => setMatchIdx(idx)}
                              title={tx(
                                entry.product.title,
                                entry.product.titleAr,
                                locale,
                              )}
                              className={`relative size-9 cursor-pointer overflow-hidden border transition-all ${
                                idx === matchIdx
                                  ? "border-gold ring-1 ring-gold"
                                  : "border-transparent opacity-60 hover:opacity-100"
                              }`}
                            >
                              {entry.product.images[0] && (
                                <Image
                                  src={entry.product.images[0]}
                                  alt=""
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                        <span className="border border-ink/10 bg-cream/90 px-2.5 py-1 font-mono text-[10px] text-ink backdrop-blur-md">
                          0{matchIdx + 1} / 0{matchedItems.length}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between bg-cream p-6">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/product/${activeProduct.slug}`}
                          className="font-display text-2xl leading-snug text-ink transition hover:text-gold"
                        >
                          {tx(
                            activeProduct.title,
                            activeProduct.titleAr,
                            locale,
                          )}
                        </Link>
                        <div className="shrink-0 text-right">
                          <span className="block font-display text-xl text-ink">
                            AED {activeProduct.price.toFixed(2)}
                          </span>
                          {activeProduct.compareAtPrice &&
                            activeProduct.compareAtPrice >
                              activeProduct.price && (
                              <s className="block text-[11px] text-fog">
                                AED {activeProduct.compareAtPrice.toFixed(2)}
                              </s>
                            )}
                        </div>
                      </div>

                      {activeProduct.notes && activeProduct.notes.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {activeProduct.notes.map((pn) => {
                            const isHit = matchedNoteSlugs.includes(
                              pn.slug.toLowerCase(),
                            );
                            const fullNote = allNotes.find(
                              (n) =>
                                n.slug.toLowerCase() === pn.slug.toLowerCase(),
                            );
                            return (
                              <span
                                key={pn.id + pn.kind}
                                className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10.5px] font-medium transition ${
                                  isHit
                                    ? "border-gold bg-gold-wash text-ink"
                                    : "border-ink/10 bg-white text-espresso"
                                }`}
                              >
                                <NoteGlyph
                                  glyph={fullNote?.glyph ?? pn.glyph}
                                  className="size-3"
                                  style={{ color: pn.color }}
                                />
                                {tx(pn.name, pn.nameAr, locale)}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-fog">
                          {tx(
                            activeProduct.shortDesc ??
                              activeProduct.lineupTitle ??
                              "Authentic Misk Al Ghazaal creation",
                            activeProduct.shortDescAr ??
                              activeProduct.lineupTitleAr,
                            locale,
                          )}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex items-center gap-2 border-t border-ink/10 pt-4">
                      <button
                        type="button"
                        onClick={(e) => handleAddToBag(e, activeProduct)}
                        className="flex flex-1 cursor-pointer items-center justify-center gap-2 border border-ink bg-ink py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-gold hover:bg-gold"
                      >
                        {addedSlug === activeProduct.slug ? (
                          <>
                            <Check className="size-3.5" />
                            {isAr ? "أُضيفت" : "Added"}
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="size-3.5" />
                            {isAr ? "أضف للسلة" : "Add to Bag"}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBuyNow(activeProduct)}
                        className="flex cursor-pointer items-center justify-center gap-1.5 border border-ink/25 bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink transition-all duration-300 hover:border-gold hover:bg-gold-wash"
                      >
                        <Zap className="size-3.5 text-gold" />
                        {isAr ? "اشترِ" : "Buy"}
                      </button>
                      <Link
                        href={`/product/${activeProduct.slug}`}
                        aria-label={pick(
                          ALCHEMIST_DEFAULTS.viewDossierLabel,
                          locale,
                        )}
                        className="flex size-10 shrink-0 items-center justify-center border border-ink/15 bg-white text-ink transition hover:border-gold hover:text-gold"
                      >
                        <ArrowUpRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}