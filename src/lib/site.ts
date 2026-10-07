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
    "Misk Al Ghazaal perfumes, dukhoon, bakhoor and holy oudh — crafted in the UAE.",
    "عطور مِسك الغزال والدخون والبخور والعود المقدس — صُنعت في الإمارات."
  ),
  announcement: L(
    "Complimentary delivery across the UAE on orders above AED 200 · Cash on Delivery",
    "توصيل مجاني في الإمارات للطلبات فوق 200 درهم · الدفع عند الاستلام"
  ),
  email: "gazaalperfumes@gmail.com",
  phone: "+971 4 000 0000",
  address: L("Mamzar Centre, Dubai, UAE", "ممرز سنتر، دبي، الإمارات"),
  hours: L("Open Mon–Sat, 10AM–5PM", "مفتوح من الاثنين للسبت، 10ص–5م"),
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

export interface ShopMenuColumn {
  heading: string;
  href: string;
  links: { label: string; href: string; external?: boolean }[];
}

export function getNavLeft(locale: Locale): NavLink[] {
  return [
    { label: pick(L("About", "من نحن"), locale), href: "/pages/about" },
    { label: pick(L("Shop", "تسوّق"), locale), href: "/collections" },
  ];
}

export function getNavRight(locale: Locale): NavLink[] {
  return [
    {
      label: pick(L("Private Label", "العلامة الخاصة"), locale),
      href: "/private-label",
    },
    { label: pick(L("Contact", "تواصل"), locale), href: "/pages/contact" },
  ];
}

/** Shop mega-dropdown columns (data-driven; Gazaal link is external). */
export function getShopMenu(locale: Locale): ShopMenuColumn[] {
  return [
    {
      heading: pick(L("Fragrances", "العطور"), locale),
      href: "/collection/arabic-fragrance",
      links: [
        { label: pick(L("For Him", "له"), locale), href: "/collection/for-him" },
        { label: pick(L("For Her", "لها"), locale), href: "/collection/for-her" },
        {
          label: pick(L("Arabic", "عربية"), locale),
          href: "/collection/arabic-fragrance",
        },
        {
          label: pick(L("Fresh", "منعشة"), locale),
          href: "/collection/fresh-fragrance",
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
        },
        {
          label: pick(L("Mubakhar", "مبخر"), locale),
          href: "/collection/mubakhar",
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
        },
        {
          label: pick(L("Best Sellers", "الأكثر مبيعاً"), locale),
          href: "/collection/best-sellers",
        },
        { label: "Gazaal", href: "https://gazaal.com", external: true },
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
      a: "Delivery is complimentary above AED 400; a flat AED 26 applies below that.",
    },
    ar: {
      q: "ما هي رسوم الشحن؟",
      a: "التوصيل مجاني فوق 400 درهم؛ و26 درهماً رسم ثابت لما دون ذلك.",
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
