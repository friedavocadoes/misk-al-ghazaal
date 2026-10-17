import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { CollectionFilters } from "@/components/blocks/CollectionFilters";
import { CatalogInfinite } from "@/components/blocks/CatalogInfinite";
import { searchCatalog, getCollections, getLineups } from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { customJsonLd, getPageSeo, seoMetadata } from "@/lib/seo";

const PAGE = 12;

export async function generateMetadata(props: PageProps<"/[locale]/search">): Promise<Metadata> {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  const seo = await getPageSeo("search");
  return seoMetadata(
    seo,
    {
      title: "Search the Maison — Misk Al Ghazaal",
      description: "Search perfumes, dukhoon and bakhoor.",
    },
    locale,
  );
}

export default async function SearchPage(
  props: PageProps<"/[locale]/search">
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Search" });
  const searchParams = await props.searchParams;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";

  const num = (v: unknown): number | null => {
    if (typeof v !== "string" || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const results = await searchCatalog(q, {
    sort: typeof searchParams?.sort === "string" ? searchParams.sort : null,
    maxPrice: num(searchParams?.max),
    minPrice: num(searchParams?.min),
    inStockOnly: searchParams?.avail === "in",
    onSaleOnly: searchParams?.sale === "1",
    minRating: num(searchParams?.rating),
    lineup: typeof searchParams?.lineup === "string" ? searchParams.lineup : null,
  });
  const full = q ? await searchCatalog(q) : [];
  const [collections, lineups, seo] = await Promise.all([getCollections(), getLineups(), getPageSeo("search")]);
  const prices = full.map((p) => p.price);
  const floor = Math.min(...prices, 0);
  const ceiling = Math.max(...prices, 200);

  const filterKey = JSON.stringify({
    q,
    a: searchParams?.avail ?? "",
    l: searchParams?.sale ?? "",
    x: searchParams?.max ?? "",
    o: searchParams?.sort ?? "",
    u: searchParams?.lineup ?? "",
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <SeoJsonLd blocks={customJsonLd(seo)} />
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        {q ? `“${q}”` : tx(seo?.h1 ?? "", seo?.h1Ar, locale) || t("title")}
      </h1>
      <p className="mt-3 text-sm text-fog">
        {q
          ? `${results.length} ${results.length === 1 ? t("foundOne") : t("found")}`
          : t("hint")}
      </p>
      {q && results.length > 0 && (
        <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
          <CollectionFilters
            key={filterKey}
            basePath="/search"
            floor={floor}
            ceiling={ceiling}
            context={{ label: `“${q}”`, clearHref: "/search" }}
            collections={collections.map((c) => ({ slug: c.slug, title: c.title, ...(c.titleAr ? { titleAr: c.titleAr } : {}) }))}
            lineups={lineups.map((l) => ({ slug: l.slug, title: l.title, ...(l.titleAr ? { titleAr: l.titleAr } : {}) }))}
            activeLineup={typeof searchParams?.lineup === "string" ? searchParams.lineup : undefined}
          />
          <div>
            <CatalogInfinite
              key={filterKey}
              initial={results.slice(0, PAGE)}
              total={results.length}
              base={{ q }}
            />
          </div>
        </div>
      )}
      {q && results.length === 0 && (
        <p className="mt-10 border border-dashed border-ink/25 py-16 text-center font-display text-xl text-ink">
          {t("found")} 0
        </p>
      )}
    </div>
  );
}
