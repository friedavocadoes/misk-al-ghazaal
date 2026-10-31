import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getProductBySlug, getPublicCoupons } from "@/lib/store";
import { getPageSeo, productJsonLd, stripHtml } from "@/lib/seo";
import { toLocale } from "@/lib/i18n";
import { ProductView } from "@/components/analytics/ProductView";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { FindInStore } from "@/components/product/FindInStore";
import { ReviewsSection } from "@/components/blocks/ProductSections";
import { OriginalesProduct } from "@/features/originales/OriginalesProduct";
import {
  editionFor,
  isOriginales,
  originalesPath,
} from "@/features/originales/config";
import { getOriginalesProducts } from "@/features/originales/data";

type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateStaticParams() {
  return (await getOriginalesProducts()).map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !isOriginales(product)) return {};
  const locale = toLocale(raw),
    edition = editionFor(product);
  return {
    title: `${edition.name} — Originales · MAG Parfum`,
    description:
      product.shortDesc ||
      stripHtml(product.descriptionHtml).slice(0, 160) ||
      `Discover ${edition.name}. An original expression by MAG Parfum.`,
    alternates: {
      canonical: `${locale === "ar" ? "/ar" : ""}${originalesPath(product)}`,
      languages: {
        en: originalesPath(product),
        ar: `/ar${originalesPath(product)}`,
      },
    },
    openGraph: {
      title: `${edition.name} — Originales`,
      images: edition.bottle ? [edition.bottle] : product.images.slice(0, 1),
    },
  };
}
export default async function OriginalesProductPage({ params }: Props) {
  const { slug, locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product || !isOriginales(product)) notFound();
  const [coupons, seo] = await Promise.all([
    getPublicCoupons(),
    getPageSeo("product", slug),
  ]);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const url = `${origin}${locale === "ar" ? "/ar" : ""}${originalesPath(product)}`;
  const schema = productJsonLd(product, seo, locale, origin).map((block) => ({
    ...block,
    ...(block["@type"] === "Product"
      ? {
          url,
          brand: { "@type": "Brand", name: "MAG Parfum" },
          offers: { ...(block.offers as Record<string, unknown>), url },
        }
      : {}),
  }));
  return (
    <>
      <SeoJsonLd blocks={schema} />
      <ProductView
        slug={product.slug}
        title={product.title}
        price={product.price}
      />
      <OriginalesProduct
        key={product.slug}
        product={product}
        coupons={coupons}
        locale={locale}
      >
        <Suspense fallback={null}>
          <FindInStore productId={product.id} locale={locale} />
        </Suspense>
        <Suspense fallback={null}>
          <ReviewsSection product={product} locale={locale} />
        </Suspense>
      </OriginalesProduct>
    </>
  );
}
