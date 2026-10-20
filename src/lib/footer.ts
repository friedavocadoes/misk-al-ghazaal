import type { Locale } from "@/i18n/routing";
import { pick, tx } from "./i18n";
import { getCollections } from "./store";
import type { FooterColumn } from "./site";
import { L } from "./site";

// Server-only footer columns (DB-backed collection names). Lives outside
// site.ts because that module is imported by client components (SiteHeader)
// and must stay free of next/headers (pulled in via store.ts).
export async function getFooterColumns(locale: Locale): Promise<FooterColumn[]> {
  const collections = await getCollections();
  const shopLinks = [
    "best-sellers",
    "new-arrivals",
    "dukhoon",
    "misk-al-ghazaal",
  ].flatMap((s) => {
    const c = collections.find((x) => x.slug === s);
    return c ? [{ label: tx(c.title, c.titleAr, locale), href: `/collection/${c.slug}` }] : [];
  });
  return [
    { heading: pick(L("Shop", "تسوّق"), locale), links: shopLinks.slice(0, 5) },
    {
      heading: pick(L("Client Care", "خدمة العملاء"), locale),
      links: [
        { label: pick(L("Contact", "تواصل"), locale), href: "/pages/contact" },
        {
          label: pick(L("FAQ & Shipping", "الأسئلة الشائعة والشحن"), locale),
          href: "/pages/faq",
        },
        {
          label: pick(L("Returns & Terms", "الإرجاع والشروط"), locale),
          href: "/pages/terms",
        },
        {
          label: pick(L("Wishlist", "المفضلة"), locale),
          href: "/pages/wishlist",
        },
      ],
    },
    {
      heading: pick(L("Maison", "الدار"), locale),
      links: [
        { label: pick(L("About Us", "من نحن"), locale), href: "/pages/about" },
        {
          label: pick(L("Private Label", "العلامة الخاصة"), locale),
          href: "/private-label",
        },
        { label: pick(L("Blogs", "المدونة"), locale), href: "/posts" },
        {
          label: pick(L("Wholesale", "الجملة"), locale),
          href: "/pages/wholesale",
        },
      ],
    },
  ];
}
