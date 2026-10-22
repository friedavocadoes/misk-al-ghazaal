"use client";
import { productAvailable, defaultVariant } from "@/lib/product-options";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Search, ShoppingBag, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { useCart } from "@/lib/cart";
import { flyToBag } from "@/lib/fly-to-bag";
import { formatAED } from "@/lib/utils";
import { tx } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { Note, Product } from "@/lib/types";

export interface OlfactoryShowcaseProps {
  products: Product[];
  notes?: Note[];
  eyebrow?: string;
  title?: string;
  prompt?: string;
  configuredNoteSlugs?: string[];
}

const PAGE_SIZE = 12;

export function OlfactoryShowcase({ products, notes = [], eyebrow, title, prompt, configuredNoteSlugs }: OlfactoryShowcaseProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("ScentFinder");
  const { add } = useCart();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [resultIndex, setResultIndex] = useState(0);
  const [added, setAdded] = useState<string | null>(null);

  const library = useMemo(() => {
    const map = new Map<string, Note>();
    for (const n of notes) map.set(n.slug.toLowerCase(), n);
    for (const p of products) for (const n of p.notes) {
      if (!map.has(n.slug.toLowerCase())) map.set(n.slug.toLowerCase(), n);
    }
    const all = Array.from(map.values());
    if (configuredNoteSlugs?.length) {
      const picks = configuredNoteSlugs.map((slug) => map.get(slug.toLowerCase())).filter((n): n is Note => !!n);
      if (picks.length) return picks;
    }
    return all.sort((a, b) => tx(a.name, a.nameAr, locale).localeCompare(tx(b.name, b.nameAr, locale), locale));
  }, [notes, products, configuredNoteSlugs, locale]);
  const filtered = library.filter((n) => `${n.name} ${n.nameAr ?? ""} ${n.slug}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const results = useMemo(() => products.map((product) => ({
    product,
    hits: selected.filter((slug) => product.notes.some((n) => n.slug.toLowerCase() === slug)).length,
  })).filter((entry) => !selected.length || entry.hits > 0).sort((a, b) => b.hits - a.hits), [products, selected]);
  const currentIndex = Math.min(resultIndex, Math.max(0, results.length - 1));
  const entry = results[currentIndex];
  const product = entry?.product;
  const variant = product ? defaultVariant(product) : undefined;
  const available = product ? productAvailable(product) : false;
  const chosen = selected.map((slug) => library.find((n) => n.slug.toLowerCase() === slug)).filter((n): n is Note => !!n);

  function toggle(slug: string) {
    setResultIndex(0);
    setSelected((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length < 3 ? [...prev, slug] : prev);
  }
  if (!products.length || !library.length) return null;

  return (
    <section className="scent-atelier border-y border-ink/10 bg-[#eee9df] py-14 md:py-24" aria-labelledby="scent-atelier-title">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5 md:mb-12">
          <div>
            <p className="eyebrow text-gold">{eyebrow || t("eyebrow")}</p>
            <h2 id="scent-atelier-title" className="mt-4 max-w-2xl font-display text-[clamp(2.2rem,4.5vw,4rem)] leading-[1.08] tracking-[-0.035em] text-ink">{title || t("title")}</h2>
          </div>
          <p className="max-w-52 text-sm leading-relaxed text-espresso">{prompt || t("instruction")}</p>
        </div>
        <div className="grid min-w-0 border-t border-ink/20 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0 pt-6 lg:pe-12 lg:pt-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <label className="flex max-w-64 flex-1 items-center gap-2 border-b border-ink/25 pb-2 focus-within:border-gold">
                <Search className="size-3.5 shrink-0 text-fog" aria-hidden="true" />
                <input aria-label={t("search")} value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder={t("search")} className="min-w-0 w-full bg-transparent text-xs text-ink outline-none placeholder:text-fog" />
              </label>
              <span dir="ltr" className="text-[10px] tabular-nums tracking-[0.15em] text-fog">{selected.length} / 3</span>
            </div>
            <div className="grid grid-cols-3 overflow-hidden border border-ink/10 bg-[#f7f4ed] sm:grid-cols-4">
              {visible.map((note) => {
                const slug = note.slug.toLowerCase();
                const active = selected.includes(slug);
                return (
                  <button key={note.id} type="button" aria-pressed={active} disabled={!active && selected.length === 3} onClick={() => toggle(slug)} className="atelier-note group relative flex min-h-32 border-b border-e border-ink/10 cursor-pointer flex-col items-center justify-center gap-2 bg-[#f7f4ed] px-2 py-5 text-ink transition-colors duration-500 hover:bg-white disabled:cursor-default disabled:opacity-40 sm:min-h-36" data-selected={active}>
                    <span className="atelier-note__mark absolute end-2 top-2 flex size-4 items-center justify-center border border-gold/50 text-gold" aria-hidden="true">{active && <Check className="size-3" />}</span>
                    <NoteGlyph glyph={note.glyph} className="atelier-note__art size-16 sm:size-20" />
                    <span className="text-center text-[10px] leading-snug tracking-[0.04em]">{tx(note.name, note.nameAr, locale)}</span>
                  </button>
                );
              })}
              {!visible.length && <p className="col-span-full bg-[#f7f4ed] px-6 py-20 text-center text-sm text-fog">{t("noNotes")}</p>}
            </div>
            <div className="mt-4 flex min-h-9 items-center justify-between gap-3">
              <button type="button" disabled={!selected.length} onClick={() => { setSelected([]); setResultIndex(0); }} className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-espresso underline-offset-4 hover:underline disabled:invisible">{t("clear")}</button>
              {pages > 1 && <div className="flex items-center gap-4 text-[10px] tabular-nums text-espresso">
                <button type="button" aria-label={t("previousNotes")} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="atelier-arrow"><ArrowLeft className="size-4 rtl:rotate-180" /></button>
                <span dir="ltr">{currentPage + 1} / {pages}</span>
                <button type="button" aria-label={t("nextNotes")} disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)} className="atelier-arrow"><ArrowRight className="size-4 rtl:rotate-180" /></button>
              </div>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 pb-5" aria-label={t("selected")}>
              {chosen.map((n) => <button key={n.id} type="button" onClick={() => toggle(n.slug.toLowerCase())} className="flex h-9 cursor-pointer items-center gap-3 border border-ink/15 px-3 text-[11px] text-ink hover:border-gold" aria-label={t("remove", { name: tx(n.name, n.nameAr, locale) })}>{tx(n.name, n.nameAr, locale)}<X className="size-3" aria-hidden="true" /></button>)}
            </div>
          </div>
          <div className="min-w-0 border-t border-ink/15 pt-6 lg:border-s lg:border-t-0 lg:ps-12 lg:pt-8">
            <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
              <p role="status" className="text-[10px] uppercase tracking-[0.16em] text-espresso">{selected.length ? t("matches", { count: results.length }) : t("selection")}</p>
              {results.length > 1 && <div className="flex items-center gap-3 text-[10px] tabular-nums text-fog">
                <button type="button" className="atelier-arrow" aria-label={t("previousPerfume")} onClick={() => setResultIndex((currentIndex - 1 + results.length) % results.length)}><ArrowLeft className="size-4 rtl:rotate-180" /></button>
                <span dir="ltr">{currentIndex + 1} / {results.length}</span>
                <button type="button" className="atelier-arrow" aria-label={t("nextPerfume")} onClick={() => setResultIndex((currentIndex + 1) % results.length)}><ArrowRight className="size-4 rtl:rotate-180" /></button>
              </div>}
            </div>
            {product ? <div key={product.slug} className="atelier-result">
              <Link href={`/product/${product.slug}`} className="group relative block aspect-[5/4] overflow-hidden bg-[#f7f4ed]" aria-label={tx(product.title, product.titleAr, locale)}>
                {product.images[0] && <Image src={product.images[0]} alt={tx(product.title, product.titleAr, locale)} fill sizes="(min-width: 1024px) 450px, 90vw" className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.035]" />}
                {selected.length > 0 && <span className="absolute bottom-4 start-4 bg-cream px-3 py-2 text-[10px] text-ink">{t("accords", { hits: entry.hits, count: selected.length })}</span>}
              </Link>
              <div className="mt-5 flex items-start justify-between gap-4">
                <Link href={`/product/${product.slug}`} className="font-display text-2xl leading-snug text-ink hover:text-gold">{tx(product.title, product.titleAr, locale)}</Link>
                <p className="shrink-0 pt-1 text-xs text-espresso">{formatAED(variant?.price ?? product.price)}</p>
              </div>
              <p className="mt-2 min-h-5 text-[11px] leading-relaxed text-fog">{product.notes.slice(0, 3).map((n) => tx(n.name, n.nameAr, locale)).join(" · ")}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" disabled={!available} className="atelier-button border border-ink/25 text-ink hover:border-ink disabled:cursor-default disabled:opacity-40" onClick={() => { if (!available) return; add({ productSlug: product.slug, variantId: variant?.id, qty: 1 }); router.push("/checkout"); }}>{t("buy")}<ArrowRight className="size-3.5 rtl:rotate-180" /></button>
                <button type="button" disabled={!available} className="atelier-button bg-ink text-cream hover:bg-espresso disabled:cursor-default disabled:opacity-40" onClick={(e) => {
                  if (!available) return;
                  add({ productSlug: product.slug, variantId: variant?.id, qty: 1 });
                  if (product.images[0]) flyToBag(e.currentTarget, product.images[0]);
                  setAdded(product.slug);
                  setTimeout(() => setAdded(null), 1600);
                }}>{added === product.slug ? <Check className="size-3.5" /> : <ShoppingBag className="size-3.5" />}{!available ? t("soldOut") : added === product.slug ? t("added") : t("add")}</button>
              </div>
            </div> : <div className="flex aspect-square flex-col items-center justify-center border border-ink/10 px-8 text-center">
              <NoteGlyph className="mb-6 size-24" />
              <p className="font-display text-2xl text-ink">{t("noMatches")}</p>
              <button type="button" onClick={() => { setSelected([]); setResultIndex(0); }} className="mt-5 text-xs text-espresso underline underline-offset-4">{t("clear")}</button>
            </div>}
          </div>
        </div>
      </div>
    </section>
  );
}
