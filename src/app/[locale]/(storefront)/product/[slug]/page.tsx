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
import { ProductCarousel } from "@/components/blocks/ProductCarousel";
import {
  getCollectionBySlug,
  getProductBySlug,
  getProducts,
  getRelatedProducts,
} from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export async function generateStaticParams() {
  const all = await getProducts();
  return all.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage(props: PageProps<"/[locale]/product/[slug]">) {
  const { slug, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Collection" });
  const ts = await getTranslations({ locale, namespace: "Sections" });
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(slug, 4);
  const collection = await getCollectionBySlug(product.categorySlugs[0]);
  const catTitle = collection
    ? tx(collection.title, collection.titleAr, locale)
    : product.categorySlugs[0]?.replace(/-/g, " ");

  return (
    <>
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
        <ProductGallery images={product.images} title={product.title} />
        <ProductInfo
          product={product}
          layout={product.template === "miskalgazaal" ? "miskalgazaal" : "standard"}
          locale={locale}
          categoryName={catTitle}
        />
      </div>
      <ProductTabsAccordion product={product} locale={locale} />
      <ProductCarousel title={ts("alsoAdore")} products={related} />
      </div>
    </>
  );
}
