import type { Article, Banner, Category, Product } from "./types";

// ---------------------------------------------------------------------------
// Local image sources (exact files on disk — no external URLs)
//  - Product photos : public/products/*.jpg (105 files, your downloads)
//  - Theme assets   : public/theme-assets/* (copied from the old Shopify theme's assets)
//  - Banners        : public/banners/*  <-- YOU must add these
//                     (original Shopify CDN files, see MISSING_BANNERS below)
// ---------------------------------------------------------------------------

const px = (prefix: string, n: number) => `/products/${prefix}-${n}.jpg`;

/** Original Shopify banner/CDN files referenced by index.json + collection/page
 *  templates that were NOT in the old Shopify theme's assets (they lived on the CDN).
 *  Download each from Shopify Admin → Content → Files (or the live CDN URL)
 *  and drop it into `public/banners/` with the EXACT name.
 *  HeroSlider/BannerSplit already reference these paths with local fallbacks. */
export const MISSING_BANNERS: string[] = [
  "Group_1dfdgfghjdfgtfhyj_1.jpg", // index hero: Misk Al Ghazaal
  "sdfghjuk_1702536360608.jpg", // index hero: Noorjes Perfumes
  "Frame_19.jpg", // index: Best Sellers banner
  "Group_3.jpg", // index: New Arrivals (Jawhara)
  "Frame_33.jpg", // index: Big Boss Dhukhoon
  "Exclusive_Perfume_Store_3.png", // galleryblock brand tile
  "186817305_543248453504793_5166025038942143116_n.jpg", // gallerybrand tile (Holy Oudh)
  "9.png", // gallery/brand tile
  "8.png", // brand tile
  "001.jpg", // collection_list tile (dukhoon)
  "002.jpg", // collection_list tile (misk-al-ghazaal)
  "1_1ef29817-ab2c-4ffb-8351-db91af72dd16.jpg", // serviceblock: Arabic Fragrance
  "2_50876fae-fcd3-4ae1-a9de-a015bc4f5762.jpg", // serviceblock: Fresh Fragrance
  "3_8b3d0f7b-22d9-445c-8458-5b2188a7eb5b.jpg", // serviceblock: Bakhoors
  "4_4a27258f-ab32-47e4-9ee8-91aa71263cd3.jpg", // serviceblock: Mubakhar
  "best_seller_1.jpg", // collection.json slideshow
  "Welcome.png", // collection holy-odh slideshow
  "Welcome1.png", // index slideshow (disabled slide)
  "80_off.png", // ramadan collection slideshow
  "111.png", // wholesale page slideshow
  "file.jpg", // parallax block image
  "three-piece-suit.jpg", // 404 parallax image
  "private-label.jpg", // hero: private-label manufacturing slide
];

type Raw = [
  slug: string,
  title: string,
  price: number,
  compareAt: number | null,
  imageCount: number,
  cats: string[],
  flags: ("new" | "best" | "feat")[],
  blurb: string,
];

// [slug matches the exact /products/<slug>-N.jpg file prefix]
const RAW: Raw[] = [
  ["abukhalid", "Abukhalid Oud — EDP 100ml", 189, null, 2, ["arabic-fragrance", "best-sellers"], ["best"], "Deep balsamic agarwood with a sweet amber dry-down."],
  ["abukhalid-home-fragrance-150ml", "Abukhalid Home Fragrance 150ml", 79, null, 5, ["arabic-fragrance"], [], "Room spray with the signature Abukhalid oud character."],
  ["ajayal", "Ajayal Musk", 99, null, 1, ["arabic-fragrance"], [], "Soft clean musk for everyday wear."],
  ["al-aqeedha-from-misk-al-ghazal-best-bakhoor", "Al Aqeedha Bakhoor — Misk Al Ghazaal", 95, 120, 3, ["dukhoon", "best-sellers"], ["best"], "Celebrated bakhoor blend direct from the manufacturer."],
  ["al-ghazaal-natural-perfume", "Al Ghazaal Natural Perfume", 129, null, 1, ["arabic-fragrance"], [], "Natural oil-based perfume, alcohol-free."],
  ["al-qasar-oud-abyad-from-misk-al-ghazal-bakhoor-tablets", "Al Qasar Oud Abyad Tablets", 89, null, 3, ["dukhoon"], [], "White-oud bakhoor tablets, bright and powdery."],
  ["amber-oud-100ml-unisex", "Amber Oud 100ml Unisex", 179, 220, 2, ["arabic-fragrance", "new-arrivals"], ["new"], "Night-weight amber wrapped in smoky oud."],
  ["amber-wood", "Amber Wood", 149, null, 1, ["arabic-fragrance"], [], "Warm woody amber, smooth and long-lasting."],
  ["anfasic-al-ward", "Anfasic Al Ward", 119, null, 2, ["arabic-fragrance"], [], "Floral bouquet over a soft musky base."],
  ["be-musky-100ml-unisex", "Be Musky 100ml Unisex", 99, null, 2, ["fresh-fragrance", "arabic-fragrance"], [], "Clean white musk with a soft powder finish."],
  ["classic-oud", "Classic Oud", 159, null, 2, ["holy-oudh", "arabic-fragrance"], [], "Classic dehn-al-oud character for connoisseurs."],
  ["diwaan-natural-perfume-for-men-and-women-success", "Diwaan Success Natural Perfume", 139, null, 3, ["arabic-fragrance"], [], "Confident natural blend for men and women."],
  ["dukhoon-eshq", "Dukhoon Eshq", 85, null, 2, ["dukhoon"], [], "Passionate sweet-spicy dukhoon for daily burning."],
  ["dukhoon-misk-al-ghazaal", "Dukhoon Misk Al Ghazaal", 89, 110, 2, ["dukhoon", "misk-al-ghazaal", "best-sellers"], ["best"], "The house dukhoon — musky, sweet, unmistakable."],
  ["dukhoonak-big-boss", "Dukhoonak Big Boss", 119, null, 2, ["dukhoon", "best-sellers"], ["best", "feat"], "Spicy agarwood and sweet amber — a profound start."],
  ["floral-garden-eau-de-parfum-100ml-for-women", "Floral Garden EDP 100ml for Women", 129, null, 2, ["fresh-fragrance"], [], "Fresh petals and green notes, light and joyful."],
  ["gazaal-chancellor-edp-100ml", "Gazaal Chancellor EDP 100ml", 169, null, 2, ["arabic-fragrance", "new-arrivals"], ["new"], "Commanding oriental with saffron and leather."],
  ["gazaal-my-wish-edp-100ml", "Gazaal My Wish EDP 100ml", 159, null, 5, ["arabic-fragrance", "new-arrivals"], ["new", "feat"], "Modern gourmand-floral, made to be gifted."],
  ["golden-musk-100ml-unisex", "Golden Musk 100ml Unisex", 109, null, 2, ["arabic-fragrance", "best-sellers"], ["best"], "Golden amber-musk glow, universally loved."],
  ["grand-hall", "Grand Hall", 149, null, 1, ["arabic-fragrance"], [], "Majestic oud and spice for evening occasions."],
  ["hob-al-banaat", "Hob Al Banaat", 119, null, 1, ["arabic-fragrance"], [], "Sweet youthful floral-musk blend."],
  ["jawahara-from-misk-al-ghazal-bakhoor-tablets-arabic-insence", "Jawhara Bakhoor Tablets", 89, 110, 3, ["dukhoon", "new-arrivals"], ["new"], "Premium tablets — vanilla, warm spice, white floral."],
  ["louvre", "Louvre", 159, null, 1, ["arabic-fragrance"], [], "Parisian-oriental elegance in a bottle."],
  ["m05", "M05", 139, null, 1, ["arabic-fragrance"], [], "Mysterious musky-woody signature scent."],
  ["misk-al-barari", "Misk Al Barari", 149, null, 1, ["misk-al-ghazaal", "arabic-fragrance"], [], "Wild-desert musk, raw and magnetic."],
  ["misk-al-ghazaal-abukhalid-50ml", "Misk Al Ghazaal Abukhalid 50ml", 149, 199, 1, ["misk-al-ghazaal", "arabic-fragrance", "best-sellers"], ["best", "feat"], "The original — musky-floral attar from the manufacturer."],
  ["misk-al-hob", "Misk Al Hob", 129, null, 1, ["misk-al-ghazaal", "arabic-fragrance"], [], "The musk of love — tender rose and white musk."],
  ["misk-al-khaleej", "Misk Al Khaleej", 139, null, 1, ["misk-al-ghazaal", "arabic-fragrance"], [], "Gulf-style musk with marine freshness."],
  ["muattar-abu-khalifa", "Muattar Abu Khalifa", 79, null, 2, ["dukhoon"], [], "Royal muattar for daily home scenting."],
  ["mubakhar-fayha", "Mubakhar Fayha", 139, null, 2, ["mubakhar", "new-arrivals"], ["new"], "Fragrant oud chips, rich smoke, long projection."],
  ["mubakhar-misk-al-khaleej", "Mubakhar Misk Al Khaleej", 129, null, 2, ["mubakhar"], [], "Mubakhar scented with the Khaleej musk accord."],
  ["naajih-eau-de-parfum-100ml-unisex", "Naajih EDP 100ml Unisex", 149, null, 2, ["arabic-fragrance"], [], "Triumphant citrus-oud composition."],
  ["no-7-zabeel-eau-de-parfum-100ml", "No.7 Zabeel EDP 100ml", 189, null, 4, ["arabic-fragrance", "best-sellers"], ["best"], "Dubai-inspired luxury — oud, rose, saffron."],
  ["noorjes-imagine", "Noorjes Imagine EDP 100ml", 229, 279, 3, ["arabic-fragrance", "best-sellers", "new-arrivals"], ["best", "new", "feat"], "Timeless elegance — citrus over jasmine and musk."],
  ["noorjes-luxury-le-don-ea-de-parfum-100ml", "Noorjes Luxury Le Don EDP 100ml", 249, null, 3, ["arabic-fragrance"], [], "Opulent gift-worthy oriental masterpiece."],
  ["noorjes-luxury-star-times-edp-100ml", "Noorjes Star Times EDP 100ml", 219, null, 5, ["arabic-fragrance"], [], "Sparkling star-fruit opening over warm woods."],
  ["noorjes-maya-eau-de-parfum-100ml", "Noorjes Maya EDP 100ml", 199, null, 4, ["arabic-fragrance"], [], "Enigmatic floral-oud for evening wear."],
  ["noorjes-star-times-all-over-spray-100ml", "Noorjes Star Times Body Spray 100ml", 89, null, 4, ["fresh-fragrance", "arabic-fragrance"], [], "Light all-over spray in the Star Times scent."],
  ["opulence", "Opulence", 179, null, 1, ["arabic-fragrance"], [], "Rich resinous luxury in every drop."],
  ["petals", "Petals", 109, null, 1, ["fresh-fragrance"], [], "Airy fresh petals, effortless daily scent."],
  ["pink-bouquet", "Pink Bouquet", 119, null, 1, ["fresh-fragrance"], [], "Pink roses and peony, bright and romantic."],
  ["qasar-al-bustan-from-misk-al-ghazaal-bakhoor-tablets-incense", "Qasar Al Bustan Tablets", 95, null, 3, ["dukhoon"], [], "Orchard-inspired bakhoor, green and sweet."],
  ["qasar-al-shiukh-from-misk-al-ghazal-bakhoor-tablets", "Qasar Al Shiukh Tablets", 95, null, 3, ["dukhoon"], [], "Majlis-grade tablets, deep and regal."],
  ["sugar-wood", "Sugar Wood", 139, null, 5, ["arabic-fragrance"], [], "Sweet creamy woods with a caramel touch."],
  ["sulthan-variamkunnan-1921", "Sulthan 1921", 199, null, 2, ["arabic-fragrance"], [], "Vintage-spice tribute scent, bold and rare."],
  ["the-legend-eau-de-parfum-100ml-unisex", "The Legend EDP 100ml Unisex", 179, null, 2, ["arabic-fragrance", "best-sellers"], ["best"], "Legendary smoky-woody projection."],
  ["white-mood-eau-de-parfum-100ml-unisex", "White Mood EDP 100ml Unisex", 119, null, 2, ["fresh-fragrance", "arabic-fragrance"], [], "Serene white florals over clean musk."],
];

const MISKALGAZAAL = new Set([
  "dukhoon-misk-al-ghazaal",
  "misk-al-barari",
  "misk-al-ghazaal-abukhalid-50ml",
  "misk-al-hob",
  "misk-al-khaleej",
]);

function buildProduct(i: number, r: Raw): Product {
  const [slug, title, price, compareAt, imageCount, cats, flags, blurb] = r;
  const images =
    slug === "noorjes-luxury-le-don-ea-de-parfum-100ml"
      ? [px(slug, 1), px(slug, 3), px(slug, 4)] // -2.jpg was never uploaded
      : Array.from({ length: imageCount }, (_, k) => px(slug, k + 1));
  return {
    id: `p${i + 1}`,
    slug,
    title,
    descriptionHtml: `<p>${blurb}</p><p>100% authentic Misk Al Ghazaal creation. Free samples on orders above 200 AED, 2–3 day delivery within the UAE, cash on delivery available.</p>`,
    price,
    ...(compareAt ? { compareAtPrice: compareAt } : {}),
    images,
    categorySlugs: cats,
    tags: [cats[0], ...flags],
    rating: 4.4 + ((i * 7) % 6) / 10,
    reviewCount: 40 + ((i * 137) % 900),
    variants: [
      {
        id: `${slug}-v1`,
        title: "Standard",
        price,
        stock: 25,
        sku: `${slug.toUpperCase().slice(0, 12)}-STD`,
      },
    ],
    ...(flags.includes("feat") ? { featured: true } : {}),
    ...(flags.includes("new") ? { isNew: true } : {}),
    ...(flags.includes("best") ? { isBestSeller: true } : {}),
    template: MISKALGAZAAL.has(slug) ? "miskalgazaal" : "standard",
  };
}

export const products: Product[] = RAW.map((r, i) => buildProduct(i, r));

/** Canonical collections (Categories). `categories` alias kept for older imports. */
export const collections: Category[] = [
  {
    id: "c1",
    slug: "arabic-fragrance",
    title: "Arabic Fragrance",
    image: px("abukhalid", 1),
    description: "Rich oriental attars and eau de parfum.",
  },
  {
    id: "c2",
    slug: "fresh-fragrance",
    title: "Fresh Fragrance",
    image: px("floral-garden-eau-de-parfum-100ml-for-women", 1),
    description: "Clean, airy everyday scents.",
  },
  {
    id: "c3",
    slug: "dukhoon",
    title: "Dukhoon / Bakhoor",
    image: px("dukhoonak-big-boss", 1),
    description: "Traditional bakhoor tablets and muattar.",
  },
  {
    id: "c4",
    slug: "mubakhar",
    title: "Mubakhar",
    image: px("mubakhar-fayha", 1),
    description: "Premium oud chips for home burning.",
  },
  {
    id: "c5",
    slug: "misk-al-ghazaal",
    title: "Misk Al Ghazaal",
    image: px("misk-al-ghazaal-abukhalid-50ml", 1),
    description: "Direct from manufacturer best sellers.",
  },
  {
    id: "c6",
    slug: "holy-oudh",
    title: "Holy Oudh",
    image: px("classic-oud", 1),
    description: "Rare Hindi and Cambodi oudh oils.",
  },
  {
    id: "c7",
    slug: "best-sellers",
    title: "Best Sellers",
    image: px("noorjes-imagine", 1),
    description: "Customer favourites across the UAE.",
  },
  {
    id: "c8",
    slug: "new-arrivals",
    title: "New Arrivals",
    image: px("gazaal-my-wish-edp-100ml", 1),
    description: "Latest drops for the season.",
  },
  {
    id: "c9",
    slug: "ramadan-bakhoor-sale",
    title: "Ramadan Bakhoor Sale",
    image: px("al-aqeedha-from-misk-al-ghazal-best-bakhoor", 1),
    description: "Festive bundles on bakhoor and dukhoon.",
  },
  {
    id: "c10",
    slug: "for-him",
    title: "For Him",
    image: px("the-legend-eau-de-parfum-100ml-unisex", 1),
    description: "Bold ouds, woods and spices.",
  },
  {
    id: "c11",
    slug: "for-her",
    title: "For Her",
    image: px("floral-garden-eau-de-parfum-100ml-for-women", 1),
    description: "Florals, musks and soft bouquets.",
  },
];

/** @deprecated Use `collections`. Kept so older blocks keep compiling. */
export const categories: Category[] = collections;

// ---------------------------------------------------------------------------
// Banners — exact original files expected in public/banners/ (see
// MISSING_BANNERS). Each has a local `fallback` so the preview never breaks.
// ---------------------------------------------------------------------------

export const heroSlides: Banner[] = [
  {
    src: "/banners/Group_1dfdgfghjdfgtfhyj_1.jpg",
    fallback: px("misk-al-ghazaal-abukhalid-50ml", 1),
    alt: "Misk Al Ghazaal",
    eyebrow: "Direct from manufacturer",
    title: "Misk Al Ghazaal",
    desc: "Get Misk Al Ghazaal products direct from the manufacturer.",
    cta: "Shop Now",
    href: "/collection/misk-al-ghazaal",
  },
  {
    src: "/banners/noorjes.webp",
    fallback: px("noorjes-imagine", 1),
    alt: "Noorjes Perfumes",
    eyebrow: "Timeless elegance",
    title: "Noorjes Perfumes",
    desc: "Experience the luxurious fragrances of Noorjes.",
    cta: "Buy Now",
    href: "/product/noorjes-imagine",
    fit: "contain",
    focal: "center",
  },
  {
    src: "/banners/Frame_19.jpg",
    fallback: px("dukhoonak-big-boss", 1),
    alt: "Best Sellers",
    eyebrow: "Best",
    title: "Sellers",
    desc: "Best selling perfumes and bakhoors from Misk Al Ghazaal.",
    cta: "Shop Now",
    href: "/collection/best-sellers",
  },
  {
    src: "/banners/Group_3.jpg",
    fallback: px(
      "jawahara-from-misk-al-ghazal-bakhoor-tablets-arabic-insence",
      1
    ),
    alt: "New Arrivals",
    eyebrow: "New",
    title: "Arrivals",
    desc: "Premium bakhoor incense — vanilla, warm spice, white floral.",
    cta: "Shop Now",
    href: "/collection/new-arrivals",
  },
  {
    src: "/banners/Frame_33.jpg",
    fallback: px("dukhoonak-big-boss", 2),
    alt: "Big Boss Dhukhoon",
    eyebrow: "Dhukhoon",
    title: "Big Boss",
    desc: "Spicy agarwood revealing deep balsamic scent and sweet amber.",
    cta: "Buy Now",
    href: "/product/dukhoonak-big-boss",
  },
  {
    src: "/banners/private-label.jpg",
    fallback: px("classic-oud", 1),
    alt: "Private label manufacturing",
    eyebrow: "For Partners",
    title: "We Bottle For You",
    desc: "Private-label attars, bakhoor and eau de parfum — crafted in our own manufactory.",
    cta: "Start Manufacturing",
    href: "/private-label",
  },
];

/** Shop-by-brand split banners (Ishi_galleryblock). */
export const brandBanners: Banner[] = [
  {
    src: "/banners/Exclusive_Perfume_Store_3.png",
    fallback: px("misk-al-ghazaal-abukhalid-50ml", 1),
    alt: "Misk Al Ghazaal exclusive store",
    title: "Misk Al Ghazaal",
    href: "/collection/misk-al-ghazaal",
  },
  {
    src: "/banners/186817305_543248453504793_5166025038942143116_n.jpg",
    fallback: px("classic-oud", 1),
    alt: "Holy Oudh",
    title: "Holy Oudh",
    href: "/collection/holy-oudh",
  },
  {
    src: "/banners/9.png",
    fallback: px("noorjes-imagine", 2),
    alt: "Maison exclusives",
    title: "Maison Exclusives",
    href: "/collection/best-sellers",
  },
];

export const articles: Article[] = [
  {
    slug: "how-to-apply-bakhoor-at-home",
    title: "How to Apply Bakhoor at Home Like a Pro",
    excerpt: "Charcoal, burners, ventilation — the ritual done right.",
    image: "/theme-assets/comment-blog.jpg",
    date: "2026-08-12",
    author: "Misk Al Ghazaal",
    contentHtml:
      "<p>Start with a quality charcoal disc, let it ash over, then place a single Jawhara tablet…</p><p>Ventilate lightly and move the mabkhara room to room for even scent.</p>",
  },
  {
    slug: "misk-vs-musk-what-is-the-difference",
    title: "Misk vs Musk: What Is the Difference?",
    excerpt: "Origins, scent profiles and how to choose.",
    image: "/theme-assets/comment-blog.jpg",
    date: "2026-07-28",
    author: "Misk Al Ghazaal",
    contentHtml:
      "<p>Misk Al Ghazaal refers to a specific traditional blend…</p>",
  },
  {
    slug: "oudh-grades-hindi-vs-cambodi",
    title: "Oudh Grades: Hindi vs Cambodi",
    excerpt: "A connoisseur's quick guide to pure dehn al oud.",
    image: "/theme-assets/comment-blog.jpg",
    date: "2026-06-15",
    author: "Misk Al Ghazaal",
    contentHtml: "<p>Hindi oudh is deep and balsamic; Cambodi is sweeter…</p>",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(slug: string): Product[] {
  if (slug === "best-sellers") return products.filter((p) => p.isBestSeller);
  if (slug === "new-arrivals") return products.filter((p) => p.isNew);
  if (slug === "ramadan-bakhoor-sale")
    return products.filter((p) => p.categorySlugs.includes("dukhoon"));
  if (slug === "for-him") return products.filter((p) => FOR_HIM.has(p.slug));
  if (slug === "for-her") return products.filter((p) => FOR_HER.has(p.slug));
  return products.filter((p) => p.categorySlugs.includes(slug));
}

const FOR_HIM = new Set([
  "abukhalid",
  "amber-oud-100ml-unisex",
  "amber-wood",
  "classic-oud",
  "diwaan-natural-perfume-for-men-and-women-success",
  "gazaal-chancellor-edp-100ml",
  "grand-hall",
  "louvre",
  "m05",
  "naajih-eau-de-parfum-100ml-unisex",
  "no-7-zabeel-eau-de-parfum-100ml",
  "opulence",
  "sulthan-variamkunnan-1921",
  "the-legend-eau-de-parfum-100ml-unisex",
]);

const FOR_HER = new Set([
  "ajayal",
  "anfasic-al-ward",
  "be-musky-100ml-unisex",
  "floral-garden-eau-de-parfum-100ml-for-women",
  "gazaal-my-wish-edp-100ml",
  "golden-musk-100ml-unisex",
  "hob-al-banaat",
  "noorjes-imagine",
  "noorjes-maya-eau-de-parfum-100ml",
  "petals",
  "pink-bouquet",
  "white-mood-eau-de-parfum-100ml-unisex",
]);

export function getCategory(slug: string): Category | undefined {
  return collections.find((c) => c.slug === slug);
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
