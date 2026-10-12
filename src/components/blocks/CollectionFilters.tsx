"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

// Explicit Apply model: every control stages locally and NOTHING touches
// the URL until Apply. No mid-drag reloads, no history spam (one push per
// deliberate apply). The parent remounts us via `key` on back/forward so
// staged state never goes stale behind the URL.
export function CollectionFilters({
  basePath,
  floor,
  ceiling,
  context,
}: {
  basePath: string;
  floor: number;
  ceiling: number;
  context?: { label: string; clearHref: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("Filters");

  const num = (k: string): number | null => {
    const v = params.get(k);
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const clampLo = (v: number, hi: number) => Math.min(Math.max(floor, v), hi - 10);
  const clampHi = (v: number, lo: number) => Math.max(Math.min(ceiling, v), lo + 10);

  const [avail, setAvail] = useState(params.get("avail") === "in");
  const [sale, setSale] = useState(params.get("sale") === "1");
  const [rating, setRating] = useState(params.get("rating") ?? "");
  const [lo, setLo] = useState(num("min") ?? floor);
  const [hi, setHi] = useState(num("max") ?? ceiling);
  const [sort, setSort] = useState(params.get("sort") ?? "featured");

  const dirty =
    avail !== (params.get("avail") === "in") ||
    sale !== (params.get("sale") === "1") ||
    rating !== (params.get("rating") ?? "") ||
    lo !== (num("min") ?? floor) ||
    hi !== (num("max") ?? ceiling) ||
    sort !== (params.get("sort") ?? "featured");

  const apply = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    if (avail) next.set("avail", "in");
    else next.delete("avail");
    if (sale) next.set("sale", "1");
    else next.delete("sale");
    if (rating) next.set("rating", rating);
    else next.delete("rating");
    if (lo > floor) next.set("min", String(lo));
    else next.delete("min");
    if (hi < ceiling) next.set("max", String(hi));
    else next.delete("max");
    if (sort !== "featured") next.set("sort", sort);
    else next.delete("sort");
    router.push(`${basePath}${next.toString() ? `?${next}` : ""}`);
  };

  const clearHref = (() => {
    // Reset facets but keep the search query itself (search page).
    const q = params.get("q");
    return q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath;
  })();

  const loPct = ((lo - floor) / Math.max(1, ceiling - floor)) * 100;
  const hiPct = ((hi - floor) / Math.max(1, ceiling - floor)) * 100;

  const checkCls =
    "flex cursor-pointer items-center gap-2.5 text-sm text-espresso";
  const boxCls = "size-4 shrink-0 cursor-pointer accent-[#8a6d2f]";

  return (
    <aside className="h-fit border border-ink/10 bg-white p-6 lg:sticky lg:top-32">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("refine")}
        </h2>
        <Link
          href={clearHref}
          className="link-underline text-[11px] font-semibold uppercase tracking-[0.16em] text-gold"
        >
          {t("clear")}
        </Link>
      </div>

      {context && (
        <Link
          href={context.clearHref}
          title={t("clear")}
          className="group mt-4 flex items-center justify-between gap-2 border border-gold/50 bg-gold-wash/50 px-3 py-2.5"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-fog">
              {t("collection")}
            </span>
            <span className="block truncate text-sm font-medium text-ink">
              {context.label}
            </span>
          </span>
          <X className="size-4 shrink-0 text-gold transition group-hover:scale-110 group-hover:text-ink" />
        </Link>
      )}

      <div className="mt-5 border-t border-ink/10 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {t("availability")}
        </p>
        <label className={checkCls + " mt-3"}>
          <input
            type="checkbox"
            checked={avail}
            onChange={(e) => setAvail(e.target.checked)}
            className={boxCls}
          />
          {t("inStock")}
        </label>
        <label className={checkCls + " mt-2.5"}>
          <input
            type="checkbox"
            checked={sale}
            onChange={(e) => setSale(e.target.checked)}
            className={boxCls}
          />
          {t("onSale")}
        </label>
      </div>

      <div className="mt-5 border-t border-ink/10 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {t("priceRange")} · Dhs {lo} – {hi}
        </p>
        <div className="dual-range relative mt-3 h-6">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-ink/15" />
          <span
            aria-hidden
            className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-gold"
            style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }}
          />
          <input
            type="range"
            min={floor}
            max={ceiling}
            step={10}
            value={lo}
            onChange={(e) => setLo(clampLo(Number(e.target.value), hi))}
            aria-label="Minimum price"
            style={{ zIndex: lo > ceiling - (ceiling - floor) * 0.15 ? 5 : 3 }}
          />
          <input
            type="range"
            min={floor}
            max={ceiling}
            step={10}
            value={hi}
            onChange={(e) => setHi(clampHi(Number(e.target.value), lo))}
            aria-label="Maximum price"
            className="!z-[4]"
          />
        </div>
      </div>

      <div className="mt-5 border-t border-ink/10 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {t("minRating")}
        </p>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="mt-3 w-full cursor-pointer rounded-[2px] border border-ink/20 bg-white px-3 py-2.5 text-sm text-ink"
          aria-label="Minimum rating"
        >
          <option value="">{t("anyRating")}</option>
          <option value="3">3★ &amp; up</option>
          <option value="4">4★ &amp; up</option>
          <option value="4.5">4.5★ &amp; up</option>
        </select>
      </div>

      <div className="mt-5 border-t border-ink/10 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {t("sort")}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="mt-3 w-full cursor-pointer rounded-[2px] border border-ink/20 bg-white px-3 py-2.5 text-sm text-ink"
          aria-label="Sort products"
        >
          <option value="featured">{t("featured")}</option>
          <option value="popular">{t("popular")}</option>
          <option value="newest">{t("newest")}</option>
          <option value="price-asc">{t("priceAsc")}</option>
          <option value="price-desc">{t("priceDesc")}</option>
          <option value="rating">{t("rating")}</option>
          <option value="discount">{t("discount")}</option>
        </select>
      </div>

      <button
        onClick={apply}
        disabled={!dirty}
        className="mt-6 w-full cursor-pointer bg-ink py-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gold-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t("apply")}
      </button>
    </aside>
  );
}
