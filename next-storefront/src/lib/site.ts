import { collections } from "./mock-data";

// ---------------------------------------------------------------------------
// Site content layer. Everything rendered as chrome/content (nav, footer,
// testimonials, FAQs, perks) lives here — never hardcoded in components.
// Phase 2: each getter below becomes a Supabase query with the same signature.
// ---------------------------------------------------------------------------

export interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

export interface Testimonial {
  name: string;
  text: string;
  meta: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Perk {
  title: string;
  desc: string;
}

export const SITE = {
  name: "Misk Al Ghazaal",
  tagline: "Misk Al Ghazaal perfumes, dukhoon, bakhoor and holy oudh — crafted in the UAE.",
  announcement:
    "Complimentary delivery across the UAE on orders above AED 200 · Cash on Delivery",
  email: "gazaalperfumes@gmail.com",
  phone: "+971 4 000 0000",
  address: "Mamzar Centre, Dubai, UAE",
  hours: "Open Mon–Sat, 10AM–5PM",
} as const;

/** Primary navbar model. Left pair = shoppers, right pair = manufacturing. */
export interface NavLink {
  label: string;
  href: string;
}

export interface ShopMenuColumn {
  heading: string;
  href: string;
  links: { label: string; href: string; external?: boolean }[];
}

export function getNavLeft(): NavLink[] {
  return [
    { label: "About", href: "/pages/about" },
    { label: "Shop", href: "/collections" },
  ];
}

export function getNavRight(): NavLink[] {
  return [
    { label: "Manufacture", href: "/manufacture" },
    { label: "Contact", href: "/pages/contact" },
  ];
}

/** Shop mega-dropdown columns (data-driven; Gazaal link is external). */
export function getShopMenu(): ShopMenuColumn[] {
  return [
    {
      heading: "Fragrances",
      href: "/collection/arabic-fragrance",
      links: [
        { label: "For Him", href: "/collection/for-him" },
        { label: "For Her", href: "/collection/for-her" },
        { label: "Arabic", href: "/collection/arabic-fragrance" },
        { label: "Fresh", href: "/collection/fresh-fragrance" },
      ],
    },
    {
      heading: "Rituals",
      href: "/collection/dukhoon",
      links: [
        { label: "Dukhoon / Bakhoor", href: "/collection/dukhoon" },
        { label: "Mubakhar", href: "/collection/mubakhar" },
      ],
    },
    {
      heading: "Edits",
      href: "/collection/new-arrivals",
      links: [
        { label: "New Arrivals", href: "/collection/new-arrivals" },
        { label: "Best Sellers", href: "/collection/best-sellers" },
        { label: "Gazaal", href: "https://gazaal.com", external: true },
      ],
    },
  ];
}

/** @deprecated Mega menu retired with the crest navbar. Use getShopMenu(). */
export interface MegaMenuItem {
  label: string;
  href: string;
  badge?: "new" | "sale" | "hot";
  columns?: unknown[];
}

/** Mega menu generated from live collections — no hardcoded categories. */
export function getMegaMenu(): MegaMenuItem[] {
  return [
    { label: "Shop", href: "/collections" },
    { label: "Misk Al Ghazaal", href: "/collection/misk-al-ghazaal" },
    { label: "Dukhoon", href: "/collection/dukhoon" },
    { label: "Holy Oudh", href: "/collection/holy-oudh" },
    { label: "New Arrivals", href: "/collection/new-arrivals" },
    { label: "Ramadan Offer", href: "/collection/ramadan-bakhoor-sale" },
    { label: "Journal", href: "/blog" },
  ];
}

export function getFooterColumns(): FooterColumn[] {
  const shopLinks = [
    "best-sellers",
    "new-arrivals",
    "dukhoon",
    "holy-oudh",
    "misk-al-ghazaal",
  ].flatMap((s) => {
    const c = collections.find((x) => x.slug === s);
    return c ? [{ label: c.title, href: `/collection/${c.slug}` }] : [];
  });
  return [
    { heading: "Shop", links: shopLinks.slice(0, 5) },
    {
      heading: "Client Care",
      links: [
        { label: "Contact", href: "/pages/contact" },
        { label: "FAQ & Shipping", href: "/pages/faq" },
        { label: "Returns & Terms", href: "/pages/terms" },
        { label: "Wishlist", href: "/pages/wishlist" },
      ],
    },
    {
      heading: "Maison",
      links: [
        { label: "About Us", href: "/pages/about" },
        { label: "Manufacture", href: "/manufacture" },
        { label: "Journal", href: "/blog" },
        { label: "Wholesale", href: "/pages/wholesale" },
      ],
    },
  ];
}

export function getTestimonials(): Testimonial[] {
  return [
    {
      name: "Ayesha K.",
      text: "Misk Al Ghazaal lasts from morning to midnight. Unmistakably authentic.",
      meta: "Verified buyer · Dubai",
    },
    {
      name: "Omar S.",
      text: "Big Boss dukhoon scents the entire majlis within minutes of lighting.",
      meta: "Verified buyer · Sharjah",
    },
    {
      name: "Fatima R.",
      text: "Ordered Tuesday, delivered Thursday — with samples I now cannot live without.",
      meta: "Verified buyer · Abu Dhabi",
    },
  ];
}

export function getFaqs(): Faq[] {
  return [
    {
      q: "How long does delivery take?",
      a: "1–3 working days within the UAE, up to 5 days for remote areas. Middle East shipping takes 5–15 days.",
    },
    {
      q: "What are the shipping charges?",
      a: "Delivery is complimentary above AED 400; a flat AED 26 applies below that.",
    },
    {
      q: "Can I pay cash on delivery?",
      a: "Yes — cash on delivery is available everywhere within the UAE.",
    },
    {
      q: "What is your return policy?",
      a: "Unopened items may be returned within 7 days (30 days with receipt for eligible items). Write to gazaalperfumes@gmail.com to begin.",
    },
  ];
}

/** Reassurance strip (was hardcoded `reassurance` blocks in main-product). */
export function getPerks(): Perk[] {
  return [
    { title: "Complimentary Shipping & Samples", desc: "On orders above 200 AED" },
    { title: "2–3 Day Delivery", desc: "Across the Emirates" },
    { title: "Cash On Delivery", desc: "Available within the UAE" },
    { title: "7-Day Returns", desc: "On unopened items" },
  ];
}
