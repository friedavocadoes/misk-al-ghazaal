"use client";

import { useState, useTransition } from "react";
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
  rituals = [],
  activeLineup,
}: {
  basePath: string;
  floor: number;
  ceiling: number;
  context?: { label: string; clearHref: string };
  collections: ShopOption[];
  lineups: ShopOption[];
  rituals?: ShopOption[];
  activeLineup?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
  const [max, setMax] = useState(Math.min(ceiling, Math.max(floor, num("max") ?? ceiling)));
  const [sort, setSort] = useState(params.get("sort") ?? "featured");
  const [lineup, setLineup] = useState(activeLineup ?? "");

  const [shopGroup, setShopGroup] = useState<"collections" | "lineups" | "rituals">("collections");
  const [shopSearch, setShopSearch] = useState("");
  const [ritual, setRitual] = useState(params.get("ritual") || "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    shop: true,
    avail: true,
    price: true,
    sort: true,
  });

  const activeCount =
    (avail ? 1 : 0) +
    (sale ? 1 : 0) +
    (max < ceiling ? 1 : 0) +
    (sort !== "featured" ? 1 : 0) +
    (lineup ? 1 : 0) + (ritual ? 1 : 0);

  const dirty =
    avail !== (params.get("avail") === "in") ||
    sale !== (params.get("sale") === "1") ||
    max !== (num("max") ?? ceiling) ||
    sort !== (params.get("sort") ?? "featured") ||
    lineup !== (activeLineup ?? "") || ritual !== (params.get("ritual") || "");

  const pushParams = (o: {
    lineupValue: string;
    ritualValue?: string;
    availValue: boolean;
    saleValue: boolean;
    maxValue: number;
    sortValue: string;
  }) => {
    const next = new URLSearchParams(params.toString());
    if (o.ritualValue ?? ritual) next.set("ritual", o.ritualValue ?? ritual); else next.delete("ritual");
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
    startTransition(() => router.push(`${basePath}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  };

  const staged = () => ({
    lineupValue: lineup,
    availValue: avail,
    saleValue: sale,
    maxValue: max,
    sortValue: sort,
  });

  const apply = () => {
    pushParams(staged());
  };

  // Availability toggles commit instantly — binary flips need no staging.
  const flipAvail = () => {
    const v = !avail;
    setAvail(v);
    pushParams({ ...staged(), availValue: v });
  };
  const flipSale = () => {
    const v = !sale;
    setSale(v);
    pushParams({ ...staged(), saleValue: v });
  };

  // Shop-by lineup commits instantly (staged facets ride along), so the
  // option visibly does something the moment it is picked.
  const applyLineup = (slug: string) => {
    setLineup(slug);
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
            className="animate-[heart-pop_0.35s_ease-out] bg-gold px-1.5 py-px text-[9px] font-bold tracking-normal text-ink"
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
      data-mobile-open={mobileOpen}
      aria-busy={pending}
      className="collection-refine h-fit animate-[filter-in_0.5s_cubic-bezier(0.22,1,0.36,1)] border border-ink/10 bg-[#f0ebe2] p-6 lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:overflow-y-auto"
    >
      <button type="button" className="collection-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen}><SlidersHorizontal className="size-4" />{t("refine")}{activeCount > 0 && ` · ${activeCount}`}<ChevronDown className="ms-auto size-4" /></button>
      <div className="collection-refine-body">
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

      {ritual && <button type="button" className="mt-2 flex w-full items-center justify-between gap-2 border border-gold/30 px-3 py-3 text-start text-sm" onClick={() => { setRitual(""); pushParams({ ...staged(), ritualValue: "" }); }}>
        {tx(rituals.find((entry) => entry.slug === ritual)?.title || ritual, rituals.find((entry) => entry.slug === ritual)?.titleAr, locale)}<X className="size-4 shrink-0" />
      </button>}
      {/* Shop by — one dropdown, two atmospheres: collections jump pages,
          lineups commit instantly (staged facets ride along). */}
      <div className="mt-5 animate-[filter-in_0.5s_0.1s_cubic-bezier(0.22,1,0.36,1)_backwards] border-t border-ink/10 pt-5">
        {sectionHead("shop", t("shopBy"), lineup || ritual ? String(Number(!!lineup) + Number(!!ritual)) : undefined)}
        {sectionBody(
          "shop",
          <div className="collection-discovery">
              <div className="discovery-tabs" aria-label={t("shopBy")}>
                {(["collections", "lineups", "rituals"] as const).map((group) => <button key={group} type="button" aria-pressed={shopGroup === group} onClick={() => { setShopGroup(group); setShopSearch(""); }}>{group === "rituals" ? (locale === "ar" ? "الطقوس" : "Rituals") : t(group)}</button>)}
              </div>
              <input aria-label={locale === "ar" ? "ابحث" : "Find a collection, lineup or ritual"} placeholder={locale === "ar" ? "ابحث…" : "Find your edit…"} value={shopSearch} onChange={(event) => setShopSearch(event.target.value)} className="my-3 w-full border-b border-ink/15 bg-transparent py-2 text-sm outline-none focus:border-gold" />
              <div className="discovery-options">
                {shopGroup === "collections" && <Link href="/collection/all" className="discovery-option">{t("all")}<span>↗</span></Link>}
                {(shopGroup === "collections" ? collections : shopGroup === "lineups" ? lineups : rituals).filter((entry) => tx(entry.title, entry.titleAr, locale).toLowerCase().includes(shopSearch.toLowerCase())).map((entry) => shopGroup === "collections" ?
                  <Link key={entry.slug} className="discovery-option" href={`/collection/${entry.slug}`}>{tx(entry.title, entry.titleAr, locale)}<span>↗</span></Link> :
                  <button key={entry.slug} type="button" className="discovery-option" aria-pressed={(shopGroup === "lineups" ? lineup : ritual) === entry.slug} onClick={() => {
                    if (shopGroup === "lineups") applyLineup(lineup === entry.slug ? "" : entry.slug);
                    else { const value = ritual === entry.slug ? "" : entry.slug; setRitual(value); pushParams({ ...staged(), ritualValue: value }); }
                  }}>{tx(entry.title, entry.titleAr, locale)}{(shopGroup === "lineups" ? lineup : ritual) === entry.slug && <Check className="size-3.5" />}</button>
                )}
                {!(shopGroup === "collections" ? collections : shopGroup === "lineups" ? lineups : rituals).filter((entry) => tx(entry.title, entry.titleAr, locale).toLowerCase().includes(shopSearch.toLowerCase())).length && <p className="py-4 text-xs text-fog">{locale === "ar" ? "لا توجد خيارات" : "No edits available here yet."}</p>}
              </div>
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
                step={1}
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
          <div role="radiogroup" aria-label={t("sort")} className="refine-sort-grid">
            {sortOptions.map((o) => {
              const on = sort === o.v;
              return (
                <label
                  key={o.v}
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
                  <input className="sr-only" type="radio" name={`sort-${basePath}`} value={o.v} checked={on} onChange={() => setSort(o.v)} />
                  {o.label}
                </label>
              );
            })}
          </div>,
        )}
      </div>

      <Button
        onClick={apply}
        disabled={!dirty || pending}
        className={cn(
          "relative mt-6 h-12 w-full overflow-hidden text-[12px] tracking-[0.2em]",
          dirty &&
            "apply-armed shadow-[0_10px_28px_-12px_rgba(138,109,47,0.9)]",
        )}
      >
        <span className="relative z-10">
          {pending ? (locale === "ar" ? "جارٍ التحديث…" : "Updating…") : t("apply")}
          {activeCount > 0 ? ` · ${activeCount}` : ""}
        </span>
        {dirty && <span aria-hidden className="apply-shine" />}
      </Button>
      </div>
    </aside>
  );
}
