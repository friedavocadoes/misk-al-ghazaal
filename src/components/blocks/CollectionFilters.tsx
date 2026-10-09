"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// React port of assets/collection-filters-form.js facets:
// availability, price range, sorting. Writes GET params
// (?avail=in&max=150&sort=price-asc) which the server page applies.
export function CollectionFilters({
  basePath,
  maxPrice,
}: {
  basePath: string;
  maxPrice: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("Filters");
  const avail = params.get("avail") === "in";
  const max = params.get("max") ?? "";
  const sort = params.get("sort") ?? "featured";

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`${basePath}${next.toString() ? `?${next}` : ""}`);
  };

  const activeCount =
    (avail ? 1 : 0) + (max ? 1 : 0) + (sort !== "featured" ? 1 : 0);

  return (
    <aside className="h-fit border border-ink/10 bg-white p-6 lg:sticky lg:top-32">
      <div className="flex items-center justify-between">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("refine")} {activeCount > 0 && `(${activeCount})`}
        </h2>
        {activeCount > 0 && (
          <button
            onClick={() => router.push(basePath)}
            className="link-underline text-[11px] font-semibold uppercase tracking-[0.16em] text-gold"
          >
            {t("clear")}
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-ink/10 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {t("availability")}
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-espresso">
          <input
            type="checkbox"
            checked={avail}
            onChange={(e) => set("avail", e.target.checked ? "in" : null)}
            className="size-4 accent-[#8a6d2f]"
          />
          {t("inStock")}
        </label>
      </div>

      <div className="mt-5 border-t border-ink/10 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {t("maxPrice")} · Dhs {max || maxPrice}
        </p>
        <input
          type="range"
          min={50}
          max={maxPrice}
          step={10}
          value={max ? Number(max) : maxPrice}
          onChange={(e) => set("max", e.target.value)}
          className="mt-3 w-full accent-[#8a6d2f]"
          aria-label="Maximum price"
        />
      </div>

      <div className="mt-5 border-t border-ink/10 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
          {t("sort")}
        </p>
        <select
          value={sort}
          onChange={(e) => set("sort", e.target.value)}
          className="mt-3 w-full rounded-[2px] border border-ink/20 bg-white px-3 py-2.5 text-sm text-ink"
          aria-label="Sort products"
        >
          <option value="featured">{t("featured")}</option>
          <option value="price-asc">{t("priceAsc")}</option>
          <option value="price-desc">{t("priceDesc")}</option>
          <option value="rating">{t("rating")}</option>
        </select>
      </div>
    </aside>
  );
}
