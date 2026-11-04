import type { Product } from "@/lib/types";

/** Temporary, presentation-only switch. No product data or prices live here. */
export const ORIGINALES_ENABLED = true;
export const ORIGINALES_SLUG = "originales";
export const RETURN_KEY = "mag-originales-return-v1";
export const ORIGINALES_NAVIGATION_EVENT = "originales:navigate";

export const EDITIONS = {
  ambrato: {
    name: "Ambrato",
    accent: "#a66c27",
    wash: "#e4cbae",
    ink: "#47301f",
    number: "01",
    reflectionSeam: "9.3%",
  },
  sultanic: {
    name: "Sultanic",
    accent: "#3e6956",
    wash: "#c7d2bf",
    ink: "#233e32",
    number: "02",
    reflectionSeam: "8.9%",
  },
  lustra: {
    name: "Lustra",
    accent: "#9a5164",
    wash: "#e0c3cc",
    ink: "#572c3a",
    number: "03",
    reflectionSeam: "10.5%",
  },
  lazvaro: {
    name: "Lazvaro",
    accent: "#35658a",
    wash: "#becfdc",
    ink: "#243e55",
    number: "04",
    reflectionSeam: "1.1%",
  },
} as const;

export function isOriginales(product: Pick<Product, "lineupSlug">): boolean {
  return (
    ORIGINALES_ENABLED && product.lineupSlug?.toLowerCase() === ORIGINALES_SLUG
  );
}
export function editionFor(product: Pick<Product, "slug" | "title">) {
  const key = (Object.keys(EDITIONS) as (keyof typeof EDITIONS)[]).find(
    (name) => `${product.slug} ${product.title}`.toLowerCase().includes(name),
  );
  const edition = key ? EDITIONS[key] : null;
  return {
    ...(edition ?? {
      name: product.title.replace(/originales/gi, "").trim(),
      accent: "#8a7962",
      wash: "#ddd4c8",
      ink: "#40392f",
      number: "O",
      reflectionSeam: "0%",
    }),
    bottle: key ? `/originales/${key}-bottle.webp` : null,
    box: key ? `/originales/${key}-box.webp` : null,
  };
}
export function originalesPath(product: Pick<Product, "slug">) {
  return `/originales/${encodeURIComponent(product.slug)}`;
}
export function storefrontProductPath(
  product: Pick<Product, "slug" | "lineupSlug">,
) {
  return isOriginales(product)
    ? originalesPath(product)
    : `/product/${encodeURIComponent(product.slug)}`;
}
export function isOriginalesPath(path: string): boolean {
  const clean = path.replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
  return clean === "/originales" || clean.startsWith("/originales/");
}
/** Never use external/private/account/checkout URLs as a remembered return target. */
export function safeReturnPath(value: string | null): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return null;
  const path =
    value.split(/[?#]/)[0].replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
  if (
    isOriginalesPath(path) ||
    /^\/(?:admin|api|auth|orders|preferences|account|checkout)(?:\/|$)/.test(
      path,
    )
  )
    return null;
  if (/originales/i.test(value)) return null;
  return value.length <= 1200 ? value : null;
}
