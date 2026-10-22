import type { Product, Variant } from "./types";

export const CONCENTRATIONS = ["Eau Fraîche", "Eau de Cologne", "Eau de Toilette", "Eau de Parfum", "Extrait de Parfum"] as const;
/** Null/omitted stock means untracked (unlimited); zero remains sold out. */
export function stockAvailable(stock:number|null|undefined):boolean { return stock == null || stock > 0; }
export function productAvailable(product: Pick<Product, "variants" | "outOfStock">): boolean {
  return !product.outOfStock && (!product.variants.length || product.variants.some(v => stockAvailable(v.stock)));
}
export function defaultVariant(product: Pick<Product, "variants">): Variant | undefined {
  return product.variants.find(v => stockAvailable(v.stock)) ?? product.variants[0];
}
export function variantImages(product: Pick<Product, "images">, variant?: Variant): string[] {
  return variant?.useProductImages === false && variant.images?.length ? variant.images : product.images;
}
export function variantLabel(concentration: string, capacity: number | null, custom: string): string {
  return [concentration, capacity ? `${capacity} ml` : ""].filter(Boolean).join(" · ") || custom.trim() || "Standard";
}
