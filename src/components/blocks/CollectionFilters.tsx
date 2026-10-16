"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Check,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { tx } from "@/lib/i18n";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export interface ShopOption {
  slug: string;
  title: string;
  titleAr?: string;
}

// Staged Apply model for avail/sale/price/sort: controls collect locally,
// ONE push per deliberate Apply (no mid-drag reloads, no history spam).
// Shop-by choices act instantly (collections jump pages, lineups commit
// the staged state + the lineup in the same push). The parent remounts via
// `key` on back/forward so staged state never trails the URL.
export function CollectionFilters({
  basePath,
  floor,
  ceiling,
  context,
  collections,
  lineups,
  activeLineup,
}: {
  basePath: string;
  floor: number;
  ceiling: number;
  context?: { label: string; clearHref: string };
  collections: ShopOption[];
  lineups: ShopOption[];
  activeLineup?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("Filters");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;

  const num = (k: string): number | null => {
    const v = params.get(k);
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const [avail, setAvail] = useState(params.get("avail") === "in");
  const [sale, setSale] = useState(params.get("sale") === "1");
  const [max, setMax] = useState(num("max") ?? ceiling);
  const [sort, setSort] = useState(params.get("sort") ?? "featured");
  const [lineup, setLineup] = useState(activeLineup ?? "");
  const [shopOpen, setShopOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    shop: true,
    avail: true,
    price: true,
    sort: true,
  });
  const shopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node))
        setShopOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShopOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const activeCount =
    (avail ? 1 : 0) +
    (sale ? 1 : 0) +
    (max < ceiling ? 1 : 0) +
    (sort !== "featured" ? 1 : 0) +
    (lineup ? 1 : 0);

  const dirty =
    avail !== (params.get("avail") === "in") ||
    sale !== (params.get("sale") === "1") ||
    max !== (num("max") ?? ceiling) ||
    sort !== (params.get("sort") ?? "featured") ||
    lineup !== (activeLineup ?? "");

  const pushParams = (o: {
    lineupValue: string;
    availValue: boolean;
    saleValue: boolean;
    maxValue: number;
    sortValue: string;
  }) => {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    next.delete("min");
    if (o.availValue) next.set("avail", "in");
    else next.delete("avail");
    if (o.saleValue) next.set("sale", "1");
    else next.delete("sale");
    if (o.maxValue < ceiling) next.set("max", String(o.maxValue));
    else next.delete("max");
    if (o.lineupValue) next.set("lineup", o.lineupValue);
    else next.delete("lineup");
    if (o.sortValue !== "featured") next.set("sort", o.sortValue);
    else next.delete("sort");
    router.push(`${basePath}${next.toString() ? `?${next}` : ""}`);
  };

  const staged = () => ({
    lineupValue: lineup,
    availValue: avail,
    saleValue: sale,
    maxValue: max,
    sortValue: sort,
  });

  const apply = () => {
    setShopOpen(false);
    pushParams(staged());
  };

  // Availability toggles commit instantly — binary flips need no staging.
  const flipAvail = () => {
    const v = !avail;
    setAvail(v);
    setShopOpen(false);
    pushParams({ ...staged(), availValue: v });
  };
  const flipSale = () => {
    const v = !sale;
    setSale(v);
    setShopOpen(false);
    pushParams({ ...staged(), saleValue: v });
  };

  // Shop-by lineup commits instantly (staged facets ride along), so the
  // option visibly does something the moment it is picked.
  const applyLineup = (slug: string) => {
    setLineup(slug);
    setShopOpen(false);
    pushParams({ ...staged(), lineupValue: slug });
  };

  const clearHref = (() => {
    const q = params.get("q");
    return q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath;
  })();

  const lineupClearHref = (() => {
    const next = new URLSearchParams(params.toString());
    next.delete("lineup");
    next.delete("page");
    return `${basePath}${next.toString() ? `?${next}` : ""}`;
  })();

  const lineupName = (slug: string) => {
    const found = lineups.find((l) => l.slug === slug);
    return found ? tx(found.title, found.titleAr, locale) : slug;
  };

  const maxPct = ((max - floor) / Math.max(1, ceiling - floor)) * 100;

  const toggleSection = (k: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  const sectionHead = (
    k: keyof typeof openSections,
    label: string,
    badge?: string,
  ) => (
    <button
      type="button"
      onClick={() => toggleSection(k)}
      aria-expanded={openSections[k]}
      className="flex w-full cursor-pointer items-center justify-between py-1 text-start"
    >
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
        {label}
        {badge && (
          <span
            key={badge}
            className="animate-[heart-pop_0.35s_ease-out] bg-gold px-1.5 py-px text-[9px] font-bold tracking-normal text-white"
          >
            {badge}
          </span>
        )}
      </span>
      <ChevronDown
        className={cn(
          "size-3.5 text-fog transition-transform duration-300",
          openSections[k] && "rotate-180",
        )}
      />
    </button>
  );

  const sectionBody = (
    k: keyof typeof openSections,
    children: React.ReactNode,
  ) => (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ gridTemplateRows: openSections[k] ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <div className="pt-3">{children}</div>
      </div>
    </div>
  );

  const sortOptions: { v: string; label: string }[] = [
    { v: "featured", label: t("featured") },
    { v: "popular", label: t("popular") },
    { v: "newest", label: t("latest") },
    { v: "price-asc", label: t("priceAsc") },
    { v: "price-desc", label: t("priceDesc") },
    { v: "rating", label: t("rating") },
  ];

  return (
    <aside
      className="h-fit animate-[filter-in_0.5s_cubic-bezier(0.22,1,0.36,1)] border border-ink/10 bg-white p-6 lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          <SlidersHorizontal className="size-3.5 text-gold" />
          {t("refine")}
          {activeCount > 0 && (
            <span
              key={activeCount}
              className="flex size-5 animate-[heart-pop_0.35s_ease-out] items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white"
            >
              {activeCount}
            </span>
          )}
        </h2>
        <Link
          href={clearHref}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold transition hover:text-ink"
        >
          <RotateCcw className="size-3" />
          {t("clear")}
        </Link>
      </div>

      {context && (
        <Link
          href={context.clearHref}
          title={t("clear")}
          className="group mt-4 flex animate-[filter-in_0.5s_0.05s_cubic-bezier(0.22,1,0.36,1)_backwards] items-center justify-between gap-2 border border-gold/50 bg-gold-wash/50 px-3 py-2.5 transition hover:border-gold"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-fog">
              {t("collection")}
            </span>
            <span className="block truncate text-sm font-medium text-ink">
              {context.label}
            </span>
          </span>
          <X className="size-4 shrink-0 text-gold transition group-hover:rotate-90 group-hover:text-ink" />
        </Link>
      )}
      {activeLineup && (
        <Link
          href={lineupClearHref}
          title={t("clear")}
          className="group mt-2 flex animate-[filter-in_0.5s_0.08s_cubic-bezier(0.22,1,0.36,1)_backwards] items-center justify-between gap-2 border border-ink bg-ink px-3 py-2.5 transition hover:bg-gold-soft"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {t("lineups")}
            </span>
            <span className="block truncate text-sm font-medium text-white group-hover:text-ink">
              {lineupName(activeLineup)}
            </span>
          </span>
          <X className="size-4 shrink-0 text-white/70 transition group-hover:rotate-90 group-hover:text-ink" />
        </Link>
      )}

      {/* Shop by — one dropdown, two atmospheres: collections jump pages,
          lineups commit instantly (staged facets ride along). */}
      <div className="mt-5 animate-[filter-in_0.5s_0.1s_cubic-bezier(0.22,1,0.36,1)_backwards] border-t border-ink/10 pt-5">
        {sectionHead("shop", t("shopBy"), lineup ? "1" : undefined)}
        {sectionBody(
          "shop",
          <div ref={shopRef} className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShopOpen((v) => !v)}
              aria-expanded={shopOpen}
              className="h-11 w-full justify-between px-3 text-sm font-medium normal-case tracking-normal"
            >
              <span className="truncate">
                {lineup ? lineupName(lineup) : t("all")}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-gold transition-transform duration-300",
                  shopOpen && "rotate-180",
                )}
              />
            </Button>
            {shopOpen && (
              <div className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 animate-[account-in_0.25s_cubic-bezier(0.22,1,0.36,1)] overflow-y-auto border border-ink/10 bg-white shadow-[0_24px_48px_-20px_rgba(28,25,23,0.4)]">
                <p className="border-b border-ink/10 px-3 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-fog">
                  {t("collections")}
                </p>
                <button
                  type="button"
                  onClick={() => applyLineup("")}
                  className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm text-espresso transition hover:bg-cream hover:text-ink"
                >
                  {t("all")}
                  {!lineup && <Check className="size-3.5 text-gold" />}
                </button>
                {collections.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/collection/${c.slug}`}
                    onClick={() => setShopOpen(false)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-espresso transition hover:translate-x-0.5 hover:bg-cream hover:text-ink rtl:hover:-translate-x-0.5"
                  >
                    <span className="truncate">
                      {tx(c.title, c.titleAr, locale)}
                    </span>
                  </Link>
                ))}
                {lineups.length > 0 && (
                  <>
                    <p className="border-b border-ink/10 border-t px-3 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-fog">
                      {t("lineups")}
                    </p>
                    {lineups.map((l) => (
                      <button
                        key={l.slug}
                        type="button"
                        onClick={() =>
                          applyLineup(lineup === l.slug ? "" : l.slug)
                        }
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-cream",
                          lineup === l.slug
                            ? "font-medium text-ink"
                            : "text-espresso hover:text-ink",
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full transition-all duration-300",
                              lineup === l.slug
                                ? "scale-125 bg-gold"
                                : "bg-ink/20",
                            )}
                          />
                          <span className="truncate">
                            {tx(l.title, l.titleAr, locale)}
                          </span>
                        </span>
                        {lineup === l.slug && (
                          <Check className="size-3.5 shrink-0 text-gold" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>,
        )}
      </div>

      <div className="mt-5 animate-[filter-in_0.5s_0.15s_cubic-bezier(0.22,1,0.36,1)_backwards] border-t border-ink/10 pt-5">
        {sectionHead(
          "avail",
          t("availability"),
          avail || sale ? String((avail ? 1 : 0) + (sale ? 1 : 0)) : undefined,
        )}
        {sectionBody(
          "avail",
          <div className="space-y-1">
            <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
              <span
                className={cn(
                  "text-sm transition-colors",
                  avail ? "font-medium text-ink" : "text-espresso",
                )}
              >
                {t("inStock")}
              </span>
              <Switch
                checked={avail}
                onCheckedChange={flipAvail}
                aria-label={t("inStock")}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
              <span
                className={cn(
                  "text-sm transition-colors",
                  sale ? "font-medium text-ink" : "text-espresso",
                )}
              >
                {t("onSale")}
              </span>
              <Switch
                checked={sale}
                onCheckedChange={flipSale}
                aria-label={t("onSale")}
              />
            </label>
          </div>,
        )}
      </div>

      {/* Max-price only: one thumb, "up to" semantics. */}
      <div className="mt-5 animate-[filter-in_0.5s_0.2s_cubic-bezier(0.22,1,0.36,1)_backwards] border-t border-ink/10 pt-5">
        {sectionHead("price", t("maxPrice"), max < ceiling ? "1" : undefined)}
        {sectionBody(
          "price",
          <div>
            <p className="text-sm text-espresso" aria-live="polite">
              {t("upTo")}{" "}
              <span className="text-base font-semibold tabular-nums text-ink">
                AED {max}
              </span>
            </p>
            <div className="relative mt-3 h-6">
              <input
                type="range"
                min={floor}
                max={ceiling}
                step={10}
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
                aria-label={t("maxPrice")}
                className="max-range w-full cursor-pointer appearance-none bg-transparent"
                style={{
                  background: `linear-gradient(to ${locale === "ar" ? "left" : "right"}, #8a6d2f ${maxPct}%, rgba(28,25,23,0.15) ${maxPct}%)`,
                  height: 3,
                  borderRadius: 9999,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] tabular-nums text-fog">
              <span>AED {floor}</span>
              <span>AED {ceiling}</span>
            </div>
          </div>,
        )}
      </div>

      <div className="mt-5 animate-[filter-in_0.5s_0.25s_cubic-bezier(0.22,1,0.36,1)_backwards] border-t border-ink/10 pt-5">
        {sectionHead("sort", t("sort"), sort !== "featured" ? "•" : undefined)}
        {sectionBody(
          "sort",
          <div role="radiogroup" aria-label={t("sort")} className="space-y-0.5">
            {sortOptions.map((o) => {
              const on = sort === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSort(o.v)}
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-2.5 px-2 py-2 text-left text-sm transition-all duration-300",
                    on
                      ? "bg-gold-wash/50 font-medium text-ink"
                      : "text-espresso hover:translate-x-1 hover:bg-cream/70 hover:text-ink rtl:hover:-translate-x-1",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full transition-all duration-300",
                      on
                        ? "scale-150 bg-gold shadow-[0_0_8px_rgba(138,109,47,0.8)]"
                        : "bg-ink/20 group-hover:bg-gold/60",
                    )}
                  />
                  {o.label}
                </button>
              );
            })}
          </div>,
        )}
      </div>

      <Button
        onClick={apply}
        disabled={!dirty}
        className={cn(
          "relative mt-6 h-12 w-full overflow-hidden text-[12px] tracking-[0.2em]",
          dirty &&
            "apply-armed shadow-[0_10px_28px_-12px_rgba(138,109,47,0.9)]",
        )}
      >
        <span className="relative z-10">
          {t("apply")}
          {activeCount > 0 ? ` · ${activeCount}` : ""}
        </span>
        {dirty && <span aria-hidden className="apply-shine" />}
      </Button>
    </aside>
  );
}
