import type { MegaMenuItem } from "@/components/layout/MegaMenu";
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
  name: "Gazaal",
  tagline: "Misk Al Ghazaal perfumes, dukhoon, bakhoor and holy oudh.",
  announcement:
    "Complimentary delivery across the UAE on orders above AED 200 · Cash on Delivery",
  email: "gazaalperfumes@gmail.com",
  phone: "+971 4 000 0000",
  address: "Mamzar Centre, Dubai, UAE",
  hours: "Open Mon–Sat, 10AM–5PM",
} as const;

/** Mega menu generated from live collections — no hardcoded categories. */
export function getMegaMenu(): MegaMenuItem[] {
  const by = (slugs: string[]) =>
    slugs.flatMap((s) => {
      const c = collections.find((x) => x.slug === s);
      return c ? [{ label: c.title, href: `/collection/${c.slug}` }] : [];
    });
  return [
    {
      label: "Shop",
      href: "/collections",
      columns: [
        {
          heading: "Fragrances",
          href: "/collection/arabic-fragrance",
          links: by([
            "arabic-fragrance",
            "fresh-fragrance",
            "best-sellers",
          ]),
        },
        {
          heading: "Rituals",
          href: "/collection/dukhoon",
          links: by(["dukhoon", "mubakhar", "holy-oudh"]),
        },
        {
          heading: "Edits",
          href: "/collection/new-arrivals",
          links: by([
            "new-arrivals",
            "misk-al-ghazaal",
            "ramadan-bakhoor-sale",
          ]),
        },
      ],
    },
    {
      label: "Misk Al Ghazaal",
      href: "/collection/misk-al-ghazaal",
      badge: "hot",
    },
    { label: "Dukhoon", href: "/collection/dukhoon" },
    { label: "Holy Oudh", href: "/collection/holy-oudh" },
    { label: "New Arrivals", href: "/collection/new-arrivals", badge: "new" },
    {
      label: "Ramadan Offer",
      href: "/collection/ramadan-bakhoor-sale",
      badge: "sale",
    },
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
        { label: "Journal", href: "/blog" },
        { label: "Wholesale", href: "/pages/wholesale" },
        { label: "Sitemap", href: "/pages/sitemap" },
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
