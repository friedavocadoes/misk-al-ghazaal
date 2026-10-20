import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PromoStrip } from "@/components/blocks/PromoStrip";
import {
  ProductInfo,
  ProductTabsAccordion,
} from "@/components/blocks/ProductDetails";
import {
  AboutShort,
  DetailedNotes,
  LineupRow,
  NotesBrief,
  ReviewsSection,
  RitualSection,
} from "@/components/blocks/ProductSections";
import { ShareButtons } from "@/components/blocks/ShareButtons";
import { ProductCarousel } from "@/components/blocks/ProductCarousel";
import {
  getCollectionBySlug,
  getApprovedReviews,
  getProductBySlug,
  getProducts,
  getPublicCoupons,
  getRelatedProducts,
} from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { getPageSeo, productJsonLd, seoMetadata, stripHtml } from "@/lib/seo";

export async function generateStaticParams() {
  const all = await getProducts();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/[locale]/product/[slug]">): Promise<Metadata> {
  const { slug, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  const [product, seo] = await Promise.all([getProductBySlug(slug), getPageSeo("product", slug)]);
  if (!product) return {};
  const title = tx(product.title, product.titleAr, locale);
  return seoMetadata(
    seo,
    {
      title: `${title} — Misk Al Ghazaal`,
      description: product.shortDesc ?? stripHtml(product.descriptionHtml).slice(0, 160),
    },
    locale,
  );
}

export default async function ProductPage(props: PageProps<"/[locale]/product/[slug]">) {
  const { slug, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Collection" });
  const ts = await getTranslations({ locale, namespace: "Sections" });
  const tp = await getTranslations({ locale, namespace: "Product" });
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(slug, 4);
  const collection = await getCollectionBySlug(product.categorySlugs[0]);
  const coupons = await getPublicCoupons();
  const seo = await getPageSeo("product", slug);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  // Real review aggregates (approved only) — fetched once, shared by the
  // buy-box line and the reviews section. Never seeded numbers.
  const approvedReviews = await getApprovedReviews(product.id, 500);
  const liveRating = product.rating;
  const catTitle = collection
    ? tx(collection.title, collection.titleAr, locale)
    : product.categorySlugs[0]?.replace(/-/g, " ");

  return (
    <>
      <SeoJsonLd
        blocks={productJsonLd(
          { ...product, rating: liveRating, reviewCount: product.reviewCount },
          seo,
          locale,
          origin,
        )}
      />
      <PromoStrip locale={locale} />
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-8 text-[11px] uppercase tracking-[0.18em] text-fog">
        <Link href="/" className="hover:text-gold">{t("home")}</Link>
        <span className="mx-2">/</span>
        <Link
          href={`/collection/${product.categorySlugs[0]}`}
          className="hover:text-gold"
        >
          {catTitle}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.title}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* min-w-0 on both tracks: Embla's flex row must never force the
            grid wider than the viewport (the mobile right-bleed bug). */}
        <div className="relative min-w-0">
          <ProductGallery images={product.images} title={product.title} />
          <ShareButtons title={product.title} label={tp("share")} copiedLabel={tp("shareCopied")} />
        </div>
        <div className="min-w-0">
          <ProductInfo
            product={product}
            layout={product.template === "miskalgazaal" ? "miskalgazaal" : "standard"}
            locale={locale}
            categoryName={catTitle}
            rating={liveRating}
            reviewCount={product.reviewCount}
            coupons={coupons}
            heading={tx(seo?.h1 ?? "", seo?.h1Ar, locale) || undefined}
          />
        </div>
      </div>
      <AboutShort product={product} locale={locale} />
      <NotesBrief product={product} locale={locale} />
      <RitualSection product={product} locale={locale} />
      <DetailedNotes product={product} locale={locale} />
      <ProductTabsAccordion product={product} locale={locale} />
      <LineupRow product={product} locale={locale} />
      <ReviewsSection product={product} locale={locale} reviews={approvedReviews} />
      <ProductCarousel title={ts("alsoAdore")} products={related} />
      </div>
    </>
  );
}
