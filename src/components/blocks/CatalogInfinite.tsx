"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

/** Infinite listing grid (collections, search, shop-all): the server
    renders page one, the sentinel streams the rest on scroll. Remounts
    (parent `key`) on every filter/sort change, so state never trails URL. */
export function CatalogInfinite({
  initial,
  total,
  base,
}: {
  initial: Product[];
  total: number;
  base: { collection?: string; q?: string };
}) {
  const params = useSearchParams();
  const [items, setItems] = useState<Product[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length < total);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || busy.current) return;
        busy.current = true;
        setLoading(true);
        const sp = new URLSearchParams({ limit: "12", offset: String(items.length) });
        if (base.collection) sp.set("collection", base.collection);
        if (base.q) sp.set("q", base.q);
        for (const k of ["sort", "min", "max", "avail", "sale", "rating", "lineup"]) {
          const v = params.get(k);
          if (v != null && v !== "") sp.set(k, v);
        }
        fetch(`/api/catalog?${sp}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((j: { products?: Product[]; hasMore?: boolean } | null) => {
            if (cancelled) return;
            if (j) {
              setItems((prev) => [...prev, ...(j.products ?? [])]);
              setHasMore(!!j.hasMore);
            }
            // On failure hasMore stays true: the next scroll retries.
          })
          .catch(() => {})
          .finally(() => {
            if (!cancelled) {
              busy.current = false;
              setLoading(false);
            }
          });
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, items.length, base.collection, base.q]);

  if (!items.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} layoutVariant="grid" />
        ))}
      </div>
      <div ref={sentinel} aria-hidden className="h-4" />
      {loading && (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-sand" />
              <div className="mx-auto mt-3 h-4 w-2/3 bg-ink/10" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
