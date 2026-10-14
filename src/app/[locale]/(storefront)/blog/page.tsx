import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { BlogCardGrid } from "@/components/blocks/ContentBlocks";
import { getArticles } from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { customJsonLd, getPageSeo, seoMetadata } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  const seo = await getPageSeo("blog");
  return seoMetadata(
    seo,
    {
      title: "Notes on Scent — Misk Al Ghazaal Journal",
      description: "Rituals, guides and notes on perfume, bakhoor and oudh.",
    },
    locale,
  );
}

export default async function BlogPage(props: PageProps<"/[locale]/blog">) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Blog" });
  const articles = await getArticles();
  const seo = await getPageSeo("blog");
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <SeoJsonLd blocks={customJsonLd(seo)} />
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        {tx(seo?.h1 ?? "", seo?.h1Ar, locale) || t("title")}
      </h1>
      <div className="mt-10">
        <BlogCardGrid articles={articles} />
      </div>
    </div>
  );
}
