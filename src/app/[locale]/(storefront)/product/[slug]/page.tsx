import { ProductView } from "@/components/analytics/ProductView";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductSelection, VariantGallery } from "@/components/product/ProductSelection";
import { PromoStrip } from "@/components/blocks/PromoStrip";
import {
  ProductInfo,
} from "@/components/blocks/ProductDetails";
import {
  productHeading,
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

  const [collection,coupons,seo] = await Promise.all([
    getCollectionBySlug(product.categorySlugs[0]),getPublicCoupons(),getPageSeo("product",slug),
  ]);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
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
      <ProductView slug={product.slug} title={product.title} price={product.price}/><div className="pdp-page mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-y-2 text-[10px] uppercase tracking-[0.12em] text-fog">
        <Link href="/" className="hover:text-gold">{t("home")}</Link>
        <span className="mx-2">/</span>
        <Link
          href={`/collection/${product.categorySlugs[0] ?? "all"}`}
          className="hover:text-gold"
        >
          {catTitle}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.title}</span>
      </nav>
      <ProductSelection product={product}><div className="pdp-overview grid items-start gap-8 lg:grid-cols-[1.08fr_1fr] lg:gap-16">
        {/* min-w-0 on both tracks: Embla's flex row must never force the
            grid wider than the viewport (the mobile right-bleed bug). */}
        <div className="relative min-w-0 lg:sticky lg:top-28">
          <VariantGallery product={product} />
          <ShareButtons title={product.title} label={tp("share")} copiedLabel={tp("shareCopied")} />
        </div>
        <div className="pdp-buybox min-w-0">
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
      </div></ProductSelection>
      <AboutShort product={product} locale={locale} />
      <NotesBrief product={product} locale={locale} />
      <DetailedNotes product={product} locale={locale} />
      <Suspense fallback={null}><RitualSection product={product} locale={locale} /></Suspense>
      <Suspense fallback={<div className="mt-12 h-64 animate-pulse bg-sand/40" />}><ReviewsSection product={product} locale={locale} /></Suspense>
      <Suspense fallback={null}><LineupRow product={product} locale={locale} /></Suspense>
      <Suspense fallback={null}><RelatedProducts slug={slug} lineupId={product.lineupId} title={productHeading(product, "recommendations", locale, ts("alsoAdore"))} /></Suspense>
      </div>
    </>
  );
}

async function RelatedProducts({slug, title, lineupId}: {slug: string; title: string; lineupId?: string}) {
  const related = await getRelatedProducts(slug, 12);
  const products = related.filter(p => !lineupId || p.lineupId !== lineupId).slice(0, 4);
  if (!products.length) return null;
  return <ProductCarousel title={title} products={products} />;
}
