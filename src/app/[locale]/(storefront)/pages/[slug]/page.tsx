import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  FaqAccordion,
  WishlistGrid,
} from "@/components/blocks/ContentBlocks";
import { ContactExperience, type ContactTopic } from "@/components/blocks/ContactExperience";
import { getProducts } from "@/lib/store";
import { getFaqs } from "@/lib/site";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
// Static info pages — mirrors page.wholesale.json, page.contact.json,
// page.faq.json (+ remaining page.*.json templates).
// Titles/eyebrows are Localizable (Arabic included); bodies are
// admin-owned long-form content (English now, Arabic later via pick()).
const PAGES: Record<
  string,
  { title: string; titleAr?: string; eyebrow: string; eyebrowAr?: string; html: string }
> = {
  wholesale: {
    title: "Wholesale",
    titleAr: "الجملة",
    eyebrow: "Trade",
    eyebrowAr: "تجارة",
    html: "<p><strong>Bulk orders accepting.</strong> Partner with Misk Al Ghazaal for retail and distribution of fine perfumes, dukhoon and bakhoor.</p><p>Write to <a href='mailto:gazaalperfumes@gmail.com'>gazaalperfumes@gmail.com</a> or visit our Mamzar Centre store in Dubai, UAE.</p>",
  },
  contact: { title: "Write to the Maison", eyebrow: "Correspondence", html: "" },
  faq: { title: "Questions, Answered", titleAr: "أسئلة وأجوبة", eyebrow: "Client Care", eyebrowAr: "خدمة العملاء", html: "" },
  wishlist: { title: "Wishlist", titleAr: "المفضلة", eyebrow: "Saved", eyebrowAr: "محفوظ", html: "" },
  about: {
    title: "Our Story",
    titleAr: "قصتنا",
    eyebrow: "Maison Misk Al Ghazaal",
    eyebrowAr: "دار مسك الغزال",
    html: "<p>Misk Al Ghazaal perfumes, dukhoon and holy oudh — crafted for the UAE. Direct from manufacturer: authentic, sealed at origin, and long-lasting.</p><p>Every order carries complimentary samples, 2–3 day delivery within the Emirates, and cash on delivery.</p>",
  },
  brands: {
    title: "Our Brands",
    titleAr: "علاماتنا",
    eyebrow: "Maisons",
    eyebrowAr: "العلامات",
    html: "<p>Misk Al Ghazaal · Noorjes · Holy Oudh · plus our maison exclusive blends.</p>",
  },
  women: {
    title: "The Women's Edit",
    titleAr: "مختارات النساء",
    eyebrow: "Edit",
    eyebrowAr: "مختارات",
    html: "<p>Soft florals, white musk and rose picks — chosen for grace and lightness.</p>",
  },
  "new-arrivals": {
    title: "New Arrivals",
    titleAr: "وصل حديثاً",
    eyebrow: "Edit",
    eyebrowAr: "مختارات",
    html: "<p>The latest seasonal drops from the maison.</p>",
  },
  terms: {
    title: "Returns & Terms",
    titleAr: "الإرجاع والشروط",
    eyebrow: "Client Care",
    eyebrowAr: "خدمة العملاء",
    html: "<p>30-day returns on unopened items with receipt. Refunds return to the original payment method within 10–45 days depending on the issuing bank.</p><p>Damaged or incorrect items are always made right — write to gazaalperfumes@gmail.com.</p>",
  },
  sitemap: {
    title: "Sitemap",
    titleAr: "خريطة الموقع",
    eyebrow: "Index",
    eyebrowAr: "فهرس",
    html: "<p>Shop, collections, journal, account and client-care pages.</p>",
  },
  "holy-oudh": {
    title: "Holy Oudh",
    titleAr: "العود المقدس",
    eyebrow: "Rare Oils",
    eyebrowAr: "زيوت نادرة",
    html: "<p>Rare Hindi and Cambodi dehn al oud for connoisseurs.</p>",
  },
  "ramadan-offer": {
    title: "The Ramadan Offer",
    titleAr: "عرض رمضان",
    eyebrow: "Season",
    eyebrowAr: "الموسم",
    html: "<p>Festive bundles on Misk Al Ghazaal perfumes and bakhoors with complimentary UAE delivery.</p>",
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default async function StaticInfoPage(
  props: PageProps<"/[locale]/pages/[slug]">
) {
  const { slug, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Contact" });
  const searchParams = await props.searchParams;
  const page = PAGES[slug];
  if (!page) notFound();

  const topicParam = searchParams?.topic;
  const initialTopic: ContactTopic | null =
    topicParam === "meeting" || topicParam === "review" || topicParam === "complaint"
      ? topicParam
      : null;
  const productList = (await getProducts()).map((p) => ({
    slug: p.slug,
    title: p.title,
    titleAr: p.titleAr,
  }));

  // Contact chrome comes from the dictionary; the rest is
  // admin-owned page content (English with Arabic fallback later).
  const header =
    slug === "contact"
      ? { eyebrow: t("eyebrow"), title: t("title") }
      : { eyebrow: tx(page.eyebrow, page.eyebrowAr, locale), title: tx(page.title, page.titleAr, locale) };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
      <p className="eyebrow text-center text-gold">{header.eyebrow}</p>
      <h1 className="mt-3 text-center font-display text-4xl text-ink md:text-5xl">
        {header.title}
      </h1>
      <span className="mx-auto mt-5 block h-px w-12 bg-gold-soft" />
      <div className="mt-10">
        {slug === "contact" && (
          <ContactExperience products={productList} initialTopic={initialTopic} />
        )}
        {slug === "faq" && <FaqAccordion items={getFaqs(locale)} />}
        {slug === "wishlist" && <WishlistGrid products={await getProducts()} />}
        {slug !== "contact" && slug !== "faq" && slug !== "wishlist" && (
          <div
            className="prose max-w-none text-espresso"
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        )}
      </div>
      {slug === "wholesale" && (
        <div className="mt-10 text-center">
          <Button asChild>
            <Link href="/pages/contact">Contact Now</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
