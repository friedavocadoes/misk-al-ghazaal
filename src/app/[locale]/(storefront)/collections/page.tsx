import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { CollectionGrid } from "@/components/blocks/CollectionBlocks";
import { getCollections } from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { customJsonLd, getPageSeo, seoMetadata } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/[locale]/collections">): Promise<Metadata> {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  const seo = await getPageSeo("collections");
  return seoMetadata(
    seo,
    {
      title: "All Collections — Misk Al Ghazaal",
      description: "Shop by fragrance family, ritual or edit — perfumes, dukhoon and bukhoor.",
    },
    locale,
  );
}

export default async function CollectionsPage(
  props: PageProps<"/[locale]/collections">
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const collections = await getCollections();
  const seo = await getPageSeo("collections");
  const h1 = tx(seo?.h1 ?? "", seo?.h1Ar, locale) || "All Collections";
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <SeoJsonLd blocks={customJsonLd(seo)} />
      <p className="eyebrow text-gold">The Library</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        {h1}
      </h1>
      <p className="mt-3 max-w-xl text-sm text-espresso">
        Shop by fragrance family, ritual or edit.
      </p>
      <div className="mt-10">
        <CollectionGrid categories={collections} locale={locale} />
      </div>
    </div>
  );
}
