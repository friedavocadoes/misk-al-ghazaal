import type { Locale } from "@/i18n/routing";
import { pick, type Localizable } from "./i18n";

// ---------------------------------------------------------------------------
// Site content layer. Everything rendered as chrome/content (nav, footer,
// testimonials, FAQs, perks) lives here — never hardcoded in components.
// Phase 2: each getter below becomes a Supabase query with the same signature.
//
// LOCALIZATION CONTRACT (admin-ready): every human string is Localizable
// { en, ar? }. Components call getters with the request locale; pick()
// resolves Arabic when present and falls back to English otherwise. The
// admin panel will one day write the `ar` side — until then, English shows
// everywhere with zero code changes. Static UI labels (buttons, aria)
// live in src/messages/{en,ar}.json via next-intl, not here.
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

export const L = <T>(en: T, ar?: T): Localizable<T> => ({ en, ar });

export const SITE = {
  name: "Misk Al Ghazaal",
  tagline: L(
    "Misk Al Ghazaal perfumes, dukhoon and bakhoor — crafted in the UAE.",
    "عطور مِسك الغزال والدخون والبخور والعود المقدس — صُنعت في الإمارات.",
  ),
  announcement: L(
    "Complimentary delivery across the UAE on orders above AED 200 · Cash on Delivery",
    "توصيل مجاني في الإمارات للطلبات فوق 200 درهم · الدفع عند الاستلام",
  ),
  email: "info@miskalghazaalperfumes.com",
  phone: "+971 4 000 0000",
  address: L("Mamzar Center, Shop No. 08, Dubai", "ممرز سنتر، دبي، الإمارات"),
  hours: L("Open Mon–Sat, 10AM–5PM", "مفتوح من الاثنين للسبت، 10ص–5م"),
};

// ---------------------------------------------------------------------------
// Locations & direct channels (Locate Us + Contact pages).
//
// OWNER TODOs: replace the placeholder digits below with the real numbers.
// Store hours are edited in SITE above (single source).
// ---------------------------------------------------------------------------

export const INSTAGRAM_URL = "https://www.instagram.com/misk.al.ghazaal";

export const STORE_CONTACT = {
  /** Boutique mobile — doubles as the shop WhatsApp line. */
  shopMobile: "+971 52 742 7627",
  /** Boutique landline (voice calls only). */
  landline: "+971 4 370 0532",
  /** Factory / private-label desk — voice + WhatsApp. */
  factoryPhone: "+971 52 661 0236",
};

/** Click-to-chat link for any display number (digits are extracted). */
export function waLink(display: string): string {
  return `https://wa.me/${display.replace(/\D/g, "")}`;
}

export interface StoreLocation {
  id: "store" | "factory";
  /** Eyebrow, e.g. "The Boutique" / "The Factory". */
  kind: Localizable<string>;
  name: Localizable<string>;
  lines: Localizable<string>[];
  /** Empty when no hours are published (factory). */
  hours: Localizable<string>[];
  /** Directions URL — empty string renders no button (factory for now). */
  mapsHref: string;
  /** Maps embed src — empty string renders the "coming soon" frame. */
  embedSrc: string;
}

const STORE_MAPS_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "Misk Al Ghazaal Perfumes Mamzar Centre Dubai UAE",
)}`;

export const LOCATIONS: { store: StoreLocation; factory: StoreLocation } = {
  store: {
    id: "store",
    kind: L("The Boutique", "البوتيك"),
    name: L("Misk Al Ghazaal Boutique", "بوتيك مسك الغزال"),
    lines: [
      SITE.address,
      L("Mamzar Centre, Ground Floor", "ممرز سنتر، الطابق الأرضي"),
    ],
    hours: [SITE.hours, L("Friday: 2PM–5PM", "الجمعة: 2–5 مساءً")],
    mapsHref: STORE_MAPS_HREF,
    embedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3297.6741687331523!2d55.35122417498967!3d25.280274877657593!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5dcff4856503%3A0xcdb6ec6f63a1c3d!2sMisk%20Al%20Gazaal%20Perfumes!5e1!3m2!1sen!2sae!4v1791444224138!5m2!1sen!2sae",
  },
  factory: {
    id: "factory",
    kind: L("The Factory", "المصنع"),
    name: L("Misk Al Ghazaal Factory", "مصنع مسك الغزال"),
    lines: [
      L(
        "Misk Al Ghazaal, Al Jerf Industrial 1, Ajman",
        "دبي، الإمارات العربية المتحدة",
      ),
    ],
    hours: [],
    mapsHref: "",
    embedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3293.606389229002!2d55.530496374995!3d25.42951317756213!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ef5f7f68e682149%3A0xec7a4174ad013365!2sMisk%20Al%20Ghazaal!5e1!3m2!1sen!2sae!4v1791447388789!5m2!1sen!2sae",
  },
};

export function getTagline(locale: Locale): string {
  return pick(SITE.tagline, locale);
}

export function getAnnouncement(locale: Locale): string {
  return pick(SITE.announcement, locale);
}

/** Primary navbar model. Left pair = shoppers, right pair = private label. */
export interface NavLink {
  label: string;
  href: string;
}

export type ShopMenuIcon =
  | "mars"
  | "venus"
  | "flame"
  | "sparkles"
  | "star"
  | "crown"
  | "arrow";

export interface ShopMenuColumn {
  heading: string;
  href: string;
  links: {
    label: string;
    href: string;
    external?: boolean;
    icon?: ShopMenuIcon;
  }[];
}

export function getNavLeft(locale: Locale): NavLink[] {
  return [
    { label: pick(L("About Us", "من نحن"), locale), href: "/pages/about" },
    {
      label: pick(L("Shop With Us", "تسوّق معنا"), locale),
      href: "/collection/all",
    },
  ];
}

export function getNavRight(locale: Locale): NavLink[] {
  return [
    {
      label: pick(L("Private Label", "العلامة الخاصة"), locale),
      href: "/private-label",
    },
    {
      label: pick(L("Get In Touch", "تواصل معنا"), locale),
      href: "/pages/contact",
    },
  ];
}

/** Shop mega-dropdown columns (data-driven; Gazaal link is external). */
export function getShopMenu(locale: Locale): ShopMenuColumn[] {
  return [
    {
      heading: pick(L("Fragrances", "العطور"), locale),
      href: "/collection/arabic-fragrance",
      links: [
        {
          label: pick(L("Men", "للرجال"), locale),
          href: "/collection/for-him",
          icon: "mars",
        },
        {
          label: pick(L("Women", "للنساء"), locale),
          href: "/collection/for-her",
          icon: "venus",
        },
      ],
    },
    {
      heading: pick(L("Rituals", "الطقوس"), locale),
      href: "/collection/dukhoon",
      links: [
        {
          label: pick(L("Dukhoon / Bakhoor", "دخون / بخور"), locale),
          href: "/collection/dukhoon",
          icon: "flame",
        },
        {
          label: pick(L("Mubakhar", "مبخر"), locale),
          href: "/collection/mubakhar",
          icon: "sparkles",
        },
      ],
    },
    {
      heading: pick(L("Edits", "مختارات"), locale),
      href: "/collection/new-arrivals",
      links: [
        {
          label: pick(L("New Arrivals", "وصل حديثاً"), locale),
          href: "/collection/new-arrivals",
          icon: "star",
        },
        {
          label: pick(L("Best Sellers", "الأكثر مبيعاً"), locale),
          href: "/collection/best-sellers",
          icon: "crown",
        },
        {
          label: "Gazaal",
          href: "https://gazaal.com",
          external: true,
          icon: "arrow",
        },
      ],
    },
  ];
}

// NOTE: footer columns moved to lib/footer.ts (server-only: needs store.ts,
// which pulls in next/headers; site.ts must stay client-importable).

// Testimonials / FAQs / perks: English today (fallback path). The admin
// panel adds `ar` per entry later — pick() resolves automatically.
const TESTIMONIALS: Localizable<Testimonial>[] = [
  {
    en: {
      name: "Ayesha K.",
      text: "Misk Al Ghazaal lasts from morning to midnight. Unmistakably authentic.",
      meta: "Verified buyer · Dubai",
    },
    ar: {
      name: "عائشة ك.",
      text: "مسك الغزال يدوم من الصباح حتى منتصف الليل. أصالة لا تُخطئ.",
      meta: "مشترية موثقة · دبي",
    },
  },
  {
    en: {
      name: "Omar S.",
      text: "Big Boss dukhoon scents the entire majlis within minutes of lighting.",
      meta: "Verified buyer · Sharjah",
    },
    ar: {
      name: "عمر س.",
      text: "دخون بيغ بوس يعطر المجلس كله خلال دقائق من إشعاله.",
      meta: "مشترٍ موثق · الشارقة",
    },
  },
  {
    en: {
      name: "Fatima R.",
      text: "Ordered Tuesday, delivered Thursday — with samples I now cannot live without.",
      meta: "Verified buyer · Abu Dhabi",
    },
    ar: {
      name: "فاطمة ر.",
      text: "طلبت الثلاثاء ووصل الخميس — مع عينات لم أعد أستغني عنها.",
      meta: "مشترية موثقة · أبوظبي",
    },
  },
];

export function getTestimonials(locale: Locale): Testimonial[] {
  return TESTIMONIALS.map((t) => pick(t, locale));
}

const FAQS: Localizable<Faq>[] = [
  {
    en: {
      q: "How long does delivery take?",
      a: "1–3 working days within the UAE, up to 5 days for remote areas. Middle East shipping takes 5–15 days.",
    },
    ar: {
      q: "كم تستغرق مدة التوصيل؟",
      a: "1–3 أيام عمل داخل الإمارات، وحتى 5 أيام للمناطق النائية. الشحن لدول الشرق الأوسط يستغرق 5–15 يوماً.",
    },
  },
  {
    en: {
      q: "What are the shipping charges?",
      a: "Delivery is complimentary above AED 200; a flat AED 26 applies below that.",
    },
    ar: {
      q: "ما هي رسوم الشحن؟",
      a: "التوصيل مجاني فوق 200 درهم؛ و26 درهماً رسم ثابت لما دون ذلك.",
    },
  },
  {
    en: {
      q: "Can I pay cash on delivery?",
      a: "Yes — cash on delivery is available everywhere within the UAE.",
    },
    ar: {
      q: "هل يمكنني الدفع عند الاستلام؟",
      a: "نعم — الدفع عند الاستلام متاح في كل أنحاء الإمارات.",
    },
  },
  {
    en: {
      q: "What is your return policy?",
      a: "Unopened items may be returned within 7 days (30 days with receipt for eligible items). Write to gazaalperfumes@gmail.com to begin.",
    },
    ar: {
      q: "ما هي سياسة الإرجاع؟",
      a: "يمكن إرجاع القطع غير المفتوحة خلال 7 أيام (30 يوماً مع الإيصال للقطع المؤهلة). راسلنا على gazaalperfumes@gmail.com للبدء.",
    },
  },
];

export function getFaqs(locale: Locale): Faq[] {
  return FAQS.map((f) => pick(f, locale));
}

/** Reassurance strip (was hardcoded `reassurance` blocks in main-product). */
const PERKS: Localizable<Perk>[] = [
  {
    en: {
      title: "Complimentary Shipping & Samples",
      desc: "On orders above 200 AED",
    },
    ar: {
      title: "شحن وعينات مجانية",
      desc: "للطلبات فوق 200 درهم",
    },
  },
  {
    en: { title: "2–3 Day Delivery", desc: "Across the Emirates" },
    ar: { title: "توصيل 2–3 أيام", desc: "في كل الإمارات" },
  },
  {
    en: { title: "Cash On Delivery", desc: "Available within the UAE" },
    ar: { title: "الدفع عند الاستلام", desc: "متاح داخل الإمارات" },
  },
  {
    en: { title: "7-Day Returns", desc: "On unopened items" },
    ar: { title: "إرجاع 7 أيام", desc: "للقطع غير المفتوحة" },
  },
];

export function getPerks(locale: Locale): Perk[] {
  return PERKS.map((p) => pick(p, locale));
}
