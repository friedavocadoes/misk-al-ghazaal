"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
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
  const locale = useLocale();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [items, setItems] = useState<Product[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length < total);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    let cancelled = false;
    const controller = new AbortController();
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || busy.current) return;
        busy.current = true;
        setLoading(true);
        setFailed(false);
        const sp = new URLSearchParams({ limit: "12", offset: String(items.length) });
        if (base.collection) sp.set("collection", base.collection);
        if (base.q) sp.set("q", base.q);
        for (const k of ["sort", "min", "max", "avail", "sale", "rating", "lineup", "ritual"]) {
          const v = params.get(k);
          if (v != null && v !== "") sp.set(k, v);
        }
        fetch(`/api/catalog?${sp}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .then((j: { products?: Product[]; hasMore?: boolean } | null) => {
            if (cancelled) return;
            if (j) {
              setItems((prev) => [...prev, ...(j.products ?? [])]);
              setHasMore(!!j.hasMore);
            }
            else setFailed(true);
          })
          .catch(() => { if (!cancelled) setFailed(true); })
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
      controller.abort();
      busy.current = false;
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, items.length, base.collection, base.q, retry]);

  if (!items.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} layoutVariant="grid" />
        ))}
      </div>
      <div className="mt-10 flex items-center gap-4 text-[10px] tracking-widest text-fog" role="status"><span className="h-px flex-1 bg-ink/10" />{items.length} / {total}<span className="h-px flex-1 bg-ink/10" /></div>
      {failed && <div className="mt-5 text-center"><button type="button" onClick={() => setRetry((value) => value + 1)} className="border border-ink/20 px-6 py-3 text-sm">{locale === "ar" ? "إعادة محاولة التحميل" : "Retry loading more"}</button></div>}
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
