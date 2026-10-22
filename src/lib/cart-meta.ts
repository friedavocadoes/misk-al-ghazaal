"use client";

import { useEffect, useState } from "react";

export interface CartMeta {
  slug: string;
  title: string;
  titleAr?: string;
  price: number;
  image: string;
  variants?: {id:string;price:number}[];
}

/** Catalog display data for bag lines (titles, images). Totals always
    come from /api/quote — never from these display prices. */
export function useCartMeta(slugs: string[]): { meta: Record<string, CartMeta>; loading: boolean } {
  const [meta, setMeta] = useState<Record<string, CartMeta>>({});
  const [loading, setLoading] = useState(false);
  const key = [...slugs].sort().join(",");
  useEffect(() => {
    if (!key) {
      setMeta({});
      return;
    }
    let live = true;
    setLoading(true);
    fetch(`/api/products?slugs=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((j: { products?: { slug: string; title: string; title_ar?: string; price: number; variants?: {id:string;price:number}[]; images?: string[] }[] }) => {
        if (!live) return;
        const map: Record<string, CartMeta> = {};
        for (const p of j.products ?? []) {
          map[p.slug] = {
            slug: p.slug,
            title: p.title,
            ...(p.title_ar ? { titleAr: p.title_ar } : {}),
            price: Number(p.price),
            variants: p.variants,
            image: p.images?.[0] ?? "",
          };
        }
        setMeta(map);
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { meta, loading };
}
