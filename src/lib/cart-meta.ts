"use client";

import { useEffect, useState } from "react";

export interface CartMeta {
  slug: string;
  title: string;
  titleAr?: string;
  price: number;
  image: string;
  variants?: CartVariant[];
}

export interface CartVariant {id:string;price:number;title?:string;name_override?:string|null;images?:string[];use_product_images?:boolean}
export function cartVariantMeta(product:CartMeta|undefined,variantId?:string):CartMeta|undefined {
  if(!product)return undefined;
  const variant=product.variants?.find(v=>v.id===variantId);
  if(!variant)return product;
  const name=variant.name_override||product.title;
  return {...product,title:variant.title?`${name} — ${variant.title}`:name,
    titleAr:variant.name_override?undefined:product.titleAr?(variant.title?`${product.titleAr} — ${variant.title}`:product.titleAr):undefined,
    price:Number(variant.price),image:variant.use_product_images===false&&variant.images?.[0]?variant.images[0]:product.image};
}

/** Catalog display data for bag lines (titles, images). Totals always
    come from /api/quote — never from these display prices. */
export function useCartMeta(slugs: string[]): { meta: Record<string, CartMeta>; loading: boolean } {
  const [result,setResult]=useState<{key:string;meta:Record<string,CartMeta>}>({key:"",meta:{}});
  const key = [...slugs].sort().join(",");
  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/products?slugs=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((j: { products?: { slug: string; title: string; title_ar?: string; price: number; variants?: CartVariant[]; images?: string[] }[] }) => {
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
        setResult({key,meta:map});
      })
      .catch(() => {if(live)setResult({key,meta:{}});});
    return () => {
      live = false;
    };
  }, [key]);
  return {meta:key?result.meta:{},loading:!!key && result.key!==key};
}
