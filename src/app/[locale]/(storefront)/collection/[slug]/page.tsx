import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CollectionFilters } from "@/components/blocks/CollectionFilters";
import { CatalogInfinite } from "@/components/blocks/CatalogInfinite";
import { PromoStrip } from "@/components/blocks/PromoStrip";
import { getCollectionBySlug, getCollections, getProductsByCollection } from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

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
  };
  const items = await getProductsByCollection(slug, opts);
  const bounds = await getProductsByCollection(slug);
  const prices = bounds.map((p) => p.price);
  const floor = Math.min(...prices, 0);
  const ceiling = Math.max(...prices, 200);

  const title = isAll
    ? locale === "ar" ? "تسوّق الكل" : "Shop All"
    : tx(category!.title, category!.titleAr, locale);
  const desc = isAll
    ? ""
    : tx(category!.description ?? "", category!.descriptionAr, locale);

  // Remount key: filter/sort navigations rebuild staged controls + page one.
  const filterKey = JSON.stringify({
    a: searchParams?.avail ?? "",
    s: searchParams?.sale ?? "",
    r: searchParams?.rating ?? "",
    n: searchParams?.min ?? "",
    x: searchParams?.max ?? "",
    o: searchParams?.sort ?? "",
  });

  return (
    <>
      <PromoStrip locale={locale} />
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.18em] text-fog">
        <Link href="/" className="hover:text-gold">{t("home")}</Link>
        <span className="mx-2">/</span>
        <Link href="/collections" className="hover:text-gold">{t("collections")}</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{title}</span>
      </nav>

      <div className="border-b border-ink/10 pb-8 pt-6 text-center">
        <p className="eyebrow text-gold">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl text-ink md:text-5xl">
          {title}
        </h1>
        {desc && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-espresso">
            {desc}
          </p>
        )}
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
          {items.length} {t("pieces")}
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
        <CollectionFilters
          key={filterKey}
          basePath={`/collection/${raw}`}
          floor={floor}
          ceiling={ceiling}
          context={isAll ? undefined : { label: title, clearHref: "/collection/all" }}
        />
        <div>
          {items.length === 0 ? (
            <div className="border border-dashed border-ink/25 py-16 text-center">
              <p className="font-display text-xl text-ink">{t("noMatchTitle")}</p>
              <p className="mt-1 text-sm text-fog">
                {t("noMatchHint")}
              </p>
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
