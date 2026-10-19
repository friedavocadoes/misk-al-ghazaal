import { SafeImage } from "@/components/ui/safe-image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CollectionFilters } from "@/components/blocks/CollectionFilters";
import { CatalogInfinite } from "@/components/blocks/CatalogInfinite";
import { getCollectionBySlug, getCollections, getLineups, getRituals, getProductsByCollection } from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { customJsonLd, getPageSeo, seoMetadata, stripHtml } from "@/lib/seo";

// Canonical collection route (singular /collection — mirrors Shopify /collections
// handles: collection.json, collection.holy-odh.json,
// collection.ramadan-bakhoor-sale.json are one grid; the slug drives the filter).
// "all" is the unfiltered shop view (the clear-target for context chips).
const ALIASES: Record<string, string> = {
  "holy-odh": "holy-oudh", // Shopify template suffix used -odh spelling
  "misk-al-ghazaal-from-manufacturer": "misk-al-ghazaal",
};

export async function generateStaticParams() {
  const all = await getCollections();
  return all.map((c) => ({ slug: c.slug }));
}

const PAGE = 12;

export async function generateMetadata(
  props: PageProps<"/[locale]/collection/[slug]">,
): Promise<Metadata> {
  const { slug: raw, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  const slug = ALIASES[raw] ?? raw;
  const [category, seo] = await Promise.all([
    slug === "all" ? null : getCollectionBySlug(slug),
    getPageSeo("collection", slug),
  ]);
  const title = category ? tx(category.title, category.titleAr, locale) : "Shop All";
  return seoMetadata(
    seo,
    {
      title: `${title} — Misk Al Ghazaal`,
      description: category?.description
        ? stripHtml(category.description).slice(0, 160)
        : `${title}: authentic perfumes, dukhoon and oudh from the manufacturer.`,
    },
    locale,
  );
}

export default async function CollectionPage(
  props: PageProps<"/[locale]/collection/[slug]">
) {
  const { slug: raw, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Collection" });
  const searchParams = await props.searchParams;
  const slug = ALIASES[raw] ?? raw;
  const isAll = slug === "all";
  const category = isAll ? null : await getCollectionBySlug(slug);
  if (!category && !isAll) notFound();

  const num = (v: unknown): number | null => {
    if (typeof v !== "string" || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const opts = {
    sort: typeof searchParams?.sort === "string" ? searchParams.sort : null,
    maxPrice: num(searchParams?.max),
    minPrice: num(searchParams?.min),
    inStockOnly: searchParams?.avail === "in",
    onSaleOnly: searchParams?.sale === "1",
    minRating: num(searchParams?.rating),
    ritual: typeof searchParams?.ritual === "string" ? searchParams.ritual : null,
    lineup: typeof searchParams?.lineup === "string" ? searchParams.lineup : null,
  };
  const [items, bounds, collections, lineups, rituals] = await Promise.all([getProductsByCollection(slug, opts), getProductsByCollection(slug), getCollections(), getLineups(), getRituals()]);
  const prices = bounds.map((p) => p.price);
  const floor = Math.min(...prices, 0);
  const ceiling = Math.max(...prices, 200);

  const title = isAll
    ? locale === "ar" ? "تسوّق الكل" : "Shop All"
    : tx(category!.title, category!.titleAr, locale);
  const desc = isAll
    ? ""
    : tx(category!.description ?? "", category!.descriptionAr, locale);
  const seo = await getPageSeo("collection", slug);
  const h1 = tx(seo?.h1 ?? "", seo?.h1Ar, locale) || title;

  // Remount key: filter/sort navigations rebuild staged controls + page one.
  const filterKey = JSON.stringify({
    a: searchParams?.avail ?? "",
    s: searchParams?.sale ?? "",
    x: searchParams?.max ?? "",
    o: searchParams?.sort ?? "",
    l: searchParams?.lineup ?? "",
    r: searchParams?.ritual ?? "",
  });

  return (
    <>
      <SeoJsonLd blocks={customJsonLd(seo)} />

      <div className="collection-experience mx-auto max-w-[1440px] px-5 py-8 md:px-10">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.18em] text-fog">
        <Link href="/" className="hover:text-gold">{t("home")}</Link>
        <span className="mx-2">/</span>
        <Link href="/collections" className="hover:text-gold">{t("collections")}</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{title}</span>
      </nav>

      <div className="collection-heading border-b border-ink/10 pb-10 pt-10 text-start">
        <div>
        <p className="eyebrow text-gold">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl text-ink md:text-7xl">
          {h1}
        </h1>
        {desc && (
          <p className="mt-5 max-w-xl text-sm text-espresso">
            {desc}
          </p>
        )}
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
          {items.length} {t("pieces")}
        </p>
        </div>
        {category?.image && <div className="collection-cover"><SafeImage src={category.image} fallback="/logo.webp" alt={title} fill sizes="(min-width:1024px) 320px, 100vw" className="object-cover" /></div>}
      </div>
      <nav className="collection-edit-rail" aria-label={locale === "ar" ? "المجموعات" : "Explore collections"}>
        <Link href="/collection/all" aria-current={isAll ? "page" : undefined}>{locale === "ar" ? "الكل" : "All creations"}</Link>
        {collections.map((entry) => <Link key={entry.slug} href={`/collection/${entry.slug}`} aria-current={entry.slug === slug ? "page" : undefined}>{tx(entry.title, entry.titleAr, locale)}</Link>)}
      </nav>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-14">
        <CollectionFilters
          key={filterKey}
          basePath={`/collection/${raw}`}
          floor={floor}
          ceiling={ceiling}
          context={isAll ? undefined : { label: title, clearHref: "/collection/all" }}
          collections={collections.map((c) => ({ slug: c.slug, title: c.title, ...(c.titleAr ? { titleAr: c.titleAr } : {}) }))}
          lineups={lineups.map((l) => ({ slug: l.slug, title: l.title, ...(l.titleAr ? { titleAr: l.titleAr } : {}) }))}
          rituals={rituals.map((entry) => ({ slug: entry.id, title: entry.title, titleAr: entry.titleAr }))}
          activeLineup={typeof searchParams?.lineup === "string" ? searchParams.lineup : undefined}
        />
        <div className="min-w-0">
          {items.length === 0 ? (
            <div className="border border-dashed border-ink/25 py-16 text-center">
              <p className="font-display text-xl text-ink">{t("noMatchTitle")}</p>
              <p className="mt-1 text-sm text-fog">
                {t("noMatchHint")}
              </p>
              <Link href={`/collection/${raw}`} className="mt-6 inline-block border-b border-gold pb-1 text-sm">{locale === "ar" ? "مسح الفلاتر" : "Clear filters"}</Link>
            </div>
          ) : (
            <CatalogInfinite
              key={filterKey}
              initial={items.slice(0, PAGE)}
              total={items.length}
              base={{ collection: slug }}
            />
          )}
        </div>
      </div>
    </div>
    </>
  );
}
