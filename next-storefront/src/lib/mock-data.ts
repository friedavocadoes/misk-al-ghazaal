import type { Article, Category, Product } from "./types";

const img = (seed: string, w = 800) =>
  `https://picsum.photos/seed/gazaal-${seed}/${w}/${w}`;

export const categories: Category[] = [
  {
    id: "c1",
    slug: "arabic-fragrance",
    title: "Arabic Fragrance",
    image: img("arabic"),
    description: "Rich oriental attars and eau de parfum.",
    productCount: 4,
  },
  {
    id: "c2",
    slug: "fresh-fragrance",
    title: "Fresh Fragrance",
    image: img("fresh"),
    description: "Clean, airy everyday scents.",
    productCount: 2,
  },
  {
    id: "c3",
    slug: "dukhoon",
    title: "Dukhoon / Bakhoor",
    image: img("dukhoon"),
    description: "Traditional bakhoor tablets and muattar.",
    productCount: 3,
  },
  {
    id: "c4",
    slug: "mubakhar",
    title: "Mubakhar",
    image: img("mubakhar"),
    description: "Premium oud chips for home burning.",
    productCount: 2,
  },
  {
    id: "c5",
    slug: "misk-al-ghazaal",
    title: "Misk Al Ghazaal",
    image: img("misk"),
    description: "Direct from manufacturer best sellers.",
    productCount: 3,
  },
  {
    id: "c6",
    slug: "holy-oudh",
    title: "Holy Oudh",
    image: img("oudh"),
    description: "Rare Hindi and Cambodi oudh oils.",
    productCount: 2,
  },
  {
    id: "c7",
    slug: "best-sellers",
    title: "Best Sellers",
    image: img("best"),
    description: "Customer favourites across the UAE.",
    productCount: 6,
  },
  {
    id: "c8",
    slug: "new-arrivals",
    title: "New Arrivals",
    image: img("new"),
    description: "Latest drops for the season.",
    productCount: 4,
  },
];

function v(
  productId: string,
  sizes: { title: string; price: number; stock?: number }[]
) {
  return sizes.map((s, i) => ({
    id: `${productId}-v${i + 1}`,
    title: s.title,
    price: s.price,
    stock: s.stock ?? 25,
    sku: `${productId.toUpperCase()}-${s.title.replace(/\s/g, "")}`,
  }));
}

export const products: Product[] = [
  {
    id: "p1",
    slug: "misk-al-ghazaal",
    title: "Misk Al Ghazaal — Eau de Parfum 50ml",
    descriptionHtml:
      "<p>Signature musky-floral attar from the original manufacturer. Long-lasting with vanilla, white floral and powdery woods.</p>",
    price: 149,
    compareAtPrice: 199,
    images: [img("misk1"), img("misk1b"), img("misk1c")],
    categorySlugs: ["arabic-fragrance", "misk-al-ghazaal", "best-sellers"],
    tags: ["musk", "best-seller"],
    rating: 4.8,
    reviewCount: 1240,
    variants: v("p1", [
      { title: "12ml", price: 59 },
      { title: "50ml", price: 149 },
    ]),
    featured: true,
    isBestSeller: true,
  },
  {
    id: "p2",
    slug: "misk-al-ghazaal-gold",
    title: "Misk Al Ghazaal Gold Edition",
    descriptionHtml: "<p>Gold edition with deeper amber and saffron warmth.</p>",
    price: 189,
    images: [img("miskgold")],
    categorySlugs: ["arabic-fragrance", "misk-al-ghazaal", "best-sellers"],
    tags: ["gold", "amber"],
    rating: 4.9,
    reviewCount: 860,
    variants: v("p2", [{ title: "50ml", price: 189 }]),
    isBestSeller: true,
  },
  {
    id: "p3",
    slug: "noorjes-imagine",
    title: "Noorjes Imagine — Luxury EDP 100ml",
    descriptionHtml:
      "<p>Timeless elegance. Citrus opening over jasmine heart and musky base.</p>",
    price: 229,
    compareAtPrice: 279,
    images: [img("noorjes"), img("noorjesb")],
    categorySlugs: ["arabic-fragrance", "best-sellers", "new-arrivals"],
    tags: ["luxury"],
    rating: 4.7,
    reviewCount: 412,
    variants: v("p3", [
      { title: "50ml", price: 149 },
      { title: "100ml", price: 229 },
    ]),
    featured: true,
    isNew: true,
    isBestSeller: true,
  },
  {
    id: "p4",
    slug: "big-boss-dhukhoon",
    title: "Big Boss Dhukhoon — Spicy Agarwood Blend 100g",
    descriptionHtml:
      "<p>Unique spicy blend revealing deep balsamic agarwood, sweet amber dry-down.</p>",
    price: 119,
    images: [img("bigboss")],
    categorySlugs: ["dukhoon", "best-sellers"],
    tags: ["agarwood", "spicy"],
    rating: 4.6,
    reviewCount: 530,
    variants: v("p4", [
      { title: "50g", price: 69 },
      { title: "100g", price: 119 },
    ]),
    isBestSeller: true,
  },
  {
    id: "p5",
    slug: "jawahara-bakhoor-tablets",
    title: "Jawhara Bakhoor Tablets — Arabic Incense",
    descriptionHtml:
      "<p>Premium bakhoor tablets. Top note vanilla, warm spicy, white floral; middle powdery, woody, aromatic.</p>",
    price: 89,
    compareAtPrice: 110,
    images: [img("jawhara"), img("jawharab")],
    categorySlugs: ["dukhoon", "new-arrivals"],
    tags: ["bakhoor", "tablets"],
    rating: 4.7,
    reviewCount: 390,
    variants: v("p5", [{ title: "80g box", price: 89 }]),
    isNew: true,
  },
  {
    id: "p6",
    slug: "holy-oudh-hindi",
    title: "Holy Oudh Hindi — Pure Dehn Al Oud 3ml",
    descriptionHtml:
      "<p>Rare Hindi oudh oil. Deep, balsamic, meditative. For connoisseurs.</p>",
    price: 349,
    images: [img("hindi")],
    categorySlugs: ["holy-oudh", "arabic-fragrance"],
    tags: ["oudh", "oil"],
    rating: 5.0,
    reviewCount: 98,
    variants: v("p6", [
      { title: "3ml", price: 349 },
      { title: "6ml", price: 649 },
    ]),
    featured: true,
  },
  {
    id: "p7",
    slug: "holy-oudh-cambodi",
    title: "Holy Oudh Cambodi — 3ml",
    descriptionHtml:
      "<p>Sweeter Cambodi profile with honeyed woods and soft leather.</p>",
    price: 299,
    images: [img("cambodi")],
    categorySlugs: ["holy-oudh", "arabic-fragrance"],
    tags: ["oudh", "oil"],
    rating: 4.9,
    reviewCount: 74,
    variants: v("p7", [{ title: "3ml", price: 299 }]),
  },
  {
    id: "p8",
    slug: "dukhoon-muattar-malaki",
    title: "Dukhoon Muattar Malaki 100g",
    descriptionHtml: "<p>Royal muattar blend for daily home scenting.</p>",
    price: 79,
    images: [img("muattar")],
    categorySlugs: ["dukhoon"],
    tags: ["muattar"],
    rating: 4.5,
    reviewCount: 210,
    variants: v("p8", [{ title: "100g", price: 79 }]),
  },
  {
    id: "p9",
    slug: "mubakhar-oud-chips",
    title: "Mubakhar Oud Chips — Superior 50g",
    descriptionHtml: "<p>Slow-burning oud chips, rich smoke, long projection.</p>",
    price: 139,
    images: [img("chips")],
    categorySlugs: ["mubakhar", "new-arrivals"],
    tags: ["chips"],
    rating: 4.6,
    reviewCount: 156,
    variants: v("p9", [{ title: "50g", price: 139 }]),
    isNew: true,
  },
  {
    id: "p10",
    slug: "fresh-musk-tahara",
    title: "Fresh Musk Tahara 50ml",
    descriptionHtml:
      "<p>Clean white musk, soft powder, everyday freshness.</p>",
    price: 99,
    images: [img("tahara")],
    categorySlugs: ["fresh-fragrance", "best-sellers"],
    tags: ["musk", "fresh"],
    rating: 4.5,
    reviewCount: 322,
    variants: v("p10", [{ title: "50ml", price: 99 }]),
    isBestSeller: true,
  },
  {
    id: "p11",
    slug: "amber-oud-nuit",
    title: "Amber Oud Nuit 80ml",
    descriptionHtml: "<p>Night-weight amber wrapped in smoky oud.</p>",
    price: 179,
    compareAtPrice: 220,
    images: [img("amber")],
    categorySlugs: ["arabic-fragrance", "new-arrivals"],
    tags: ["amber", "oud"],
    rating: 4.7,
    reviewCount: 188,
    variants: v("p11", [{ title: "80ml", price: 179 }]),
    isNew: true,
  },
  {
    id: "p12",
    slug: "rose-taifi-bouquet",
    title: "Rose Taifi Bouquet 60ml",
    descriptionHtml: "<p>Highland Taif rose with saffron and soft oud base.</p>",
    price: 199,
    images: [img("rose")],
    categorySlugs: ["arabic-fragrance", "fresh-fragrance"],
    tags: ["rose"],
    rating: 4.8,
    reviewCount: 264,
    variants: v("p12", [{ title: "60ml", price: 199 }]),
    featured: true,
  },
];

export const articles: Article[] = [
  {
    slug: "how-to-apply-bakhoor-at-home",
    title: "How to Apply Bakhoor at Home Like a Pro",
    excerpt: "Charcoal, burners, ventilation — the ritual done right.",
    image: img("blog1", 1200),
    date: "2026-08-12",
    author: "Gazaal",
    contentHtml:
      "<p>Start with a quality charcoal disc, let it ash over, then place a single Jawhara tablet…</p><p>Ventilate lightly and move the mabkhara room to room for even scent.</p>",
  },
  {
    slug: "misk-vs-musk-what-is-the-difference",
    title: "Misk vs Musk: What Is the Difference?",
    excerpt: "Origins, scent profiles and how to choose.",
    image: img("blog2", 1200),
    date: "2026-07-28",
    author: "Gazaal",
    contentHtml:
      "<p>Misk Al Ghazaal refers to a specific traditional blend…</p>",
  },
  {
    slug: "oudh-grades-hindi-vs-cambodi",
    title: "Oudh Grades: Hindi vs Cambodi",
    excerpt: "A connoisseur's quick guide to pure dehn al oud.",
    image: img("blog3", 1200),
    date: "2026-06-15",
    author: "Gazaal",
    contentHtml: "<p>Hindi oudh is deep and balsamic; Cambodi is sweeter…</p>",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(slug: string): Product[] {
  if (slug === "best-sellers") return products.filter((p) => p.isBestSeller);
  if (slug === "new-arrivals") return products.filter((p) => p.isNew);
  return products.filter((p) => p.categorySlugs.includes(slug));
}

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function searchProducts(q: string): Product[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return products.filter((p) =>
    `${p.title} ${p.tags.join(" ")} ${p.categorySlugs.join(" ")}`
      .toLowerCase()
      .includes(needle)
  );
}
