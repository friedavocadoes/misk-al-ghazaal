"use client";

import { useRouter, useSearchParams } from "next/navigation";

// React port of assets/collection-filters-form.js facets:
// availability, price range, sorting + active-facet pills. Submits as GET
// params (?avail=in&max=150&sort=price-asc) which the server page applies.
export function CollectionFilters({
  basePath,
  maxPrice,
}: {
  basePath: string;
  maxPrice: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
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
    <aside className="h-fit rounded-3xl border border-stone-200 bg-white p-5 lg:sticky lg:top-32">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-stone-900">
          Filters {activeCount > 0 && `(${activeCount})`}
        </h2>
        {activeCount > 0 && (
          <button
            onClick={() => router.push(basePath)}
            className="text-xs font-semibold text-emerald-900 underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-stone-100 pt-4">
        <p className="text-sm font-semibold">Availability</p>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={avail}
            onChange={(e) => set("avail", e.target.checked ? "in" : null)}
            className="size-4 accent-emerald-900"
          />
          In stock only
        </label>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-4">
        <p className="text-sm font-semibold">Max price (AED)</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={50}
            max={maxPrice}
            step={10}
            value={max ? Number(max) : maxPrice}
            onChange={(e) => set("max", e.target.value)}
            className="w-full accent-emerald-900"
            aria-label="Maximum price"
          />
          <span className="w-12 text-right text-sm font-semibold">
            {max || maxPrice}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-4">
        <p className="text-sm font-semibold">Sort by</p>
        <select
          value={sort}
          onChange={(e) => set("sort", e.target.value)}
          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          aria-label="Sort products"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
    </aside>
  );
}
