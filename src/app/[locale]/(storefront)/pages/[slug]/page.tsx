import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FaqAccordion, WishlistGrid } from "@/components/blocks/ContentBlocks";
import { type ContactTopic } from "@/components/blocks/ContactExperience";
import { ContactLanding } from "@/components/blocks/ContactLanding";
import { getProducts } from "@/lib/store";
import { getFaqs } from "@/lib/site";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { customJsonLd, getPageSeo, seoMetadata, stripHtml } from "@/lib/seo";
// Static info pages — mirrors page.wholesale.json, page.contact.json,
// page.faq.json (+ remaining page.*.json templates).
// Titles/eyebrows are Localizable (Arabic included); bodies are
// admin-owned long-form content (English now, Arabic later via pick()).
// Shared with the admin SEO hub and sitemap through lib/info-pages.ts.
import { PAGES } from "@/lib/info-pages";

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/[locale]/pages/[slug]">,
): Promise<Metadata> {
  const { slug, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  const page = PAGES[slug];
  const seo = await getPageSeo("info", slug);
  if (!page) return {};
  const title = tx(page.title, page.titleAr, locale);
  return seoMetadata(
    seo,
    {
      title: `${title} — Misk Al Ghazaal`,
      description: stripHtml(page.html).slice(0, 160) || title,
    },
    locale,
  );
}

export default async function StaticInfoPage(
  props: PageProps<"/[locale]/pages/[slug]">,
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
    topicParam === "meeting" ||
    topicParam === "review" ||
    topicParam === "complaint"
      ? topicParam
      : null;
  const productList =
    slug === "contact"
      ? getProducts()
          .then((rows) =>
            rows.map((p) => ({
              slug: p.slug,
              title: p.title,
              titleAr: p.titleAr,
            })),
          )
          .catch(() => [])
      : Promise.resolve([]);

  // Contact chrome comes from the dictionary; the rest is
  // admin-owned page content (English with Arabic fallback later).
  const header =
    slug === "contact"
      ? { eyebrow: t("eyebrow"), title: t("title") }
      : {
          eyebrow: tx(page.eyebrow, page.eyebrowAr, locale),
          title: tx(page.title, page.titleAr, locale),
        };
  const seo = await getPageSeo("info", slug);

  if (slug === "contact")
    return (
      <>
        <SeoJsonLd blocks={customJsonLd(seo)} />
        <ContactLanding
          locale={locale}
          title={tx(seo?.h1 ?? "", seo?.h1Ar, locale) || header.title}
          eyebrow={header.eyebrow}
          products={productList}
          initialTopic={initialTopic}
        />
      </>
    );
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
      <SeoJsonLd blocks={customJsonLd(seo)} />
      <p className="eyebrow text-center text-gold">{header.eyebrow}</p>
      <h1 className="mt-3 text-center font-display text-4xl text-ink md:text-5xl">
        {tx(seo?.h1 ?? "", seo?.h1Ar, locale) || header.title}
      </h1>
      <span className="mx-auto mt-5 block h-px w-12 bg-gold-soft" />
      <div className="mt-10">
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
