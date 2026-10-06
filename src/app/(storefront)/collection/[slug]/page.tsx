import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { CollectionFilters } from "@/components/blocks/CollectionFilters";
import { PromoStrip } from "@/components/blocks/PromoStrip";
import { Pagination } from "@/components/ui/pagination";
import { getCollectionBySlug, getCollections, getProductsByCollection } from "@/lib/store";

// Canonical collection route (singular /collection — mirrors Shopify /collections
// handles: collection.json, collection.holy-odh.json,
// collection.ramadan-bakhoor-sale.json are one grid; the slug drives the filter).
const ALIASES: Record<string, string> = {
  "holy-odh": "holy-oudh", // Shopify template suffix used -odh spelling
  "misk-al-ghazaal-from-manufacturer": "misk-al-ghazaal",
};

export async function generateStaticParams() {
  const all = await getCollections();
  return all.map((c) => ({ slug: c.slug }));
}

const PAGE_SIZE = 12;

export default async function CollectionPage(
  props: PageProps<"/collection/[slug]">
) {
  const { slug: raw } = await props.params;
  const searchParams = await props.searchParams;
  const slug = ALIASES[raw] ?? raw;
  const category = await getCollectionBySlug(slug);
  if (!category) notFound();

  const maxParam = searchParams?.max ? Number(searchParams.max) : null;
  const items = await getProductsByCollection(slug, {
    sort: typeof searchParams?.sort === "string" ? searchParams.sort : null,
    maxPrice: maxParam != null && !Number.isNaN(maxParam) ? maxParam : null,
    inStockOnly: searchParams?.avail === "in",
  });
  const full = await getProductsByCollection(slug);
  const maxPrice = Math.max(...full.map((p) => p.price), 200);

  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filterParams = new URLSearchParams();
  if (searchParams?.avail) filterParams.set("avail", String(searchParams.avail));
  if (searchParams?.max) filterParams.set("max", String(searchParams.max));
  if (searchParams?.sort) filterParams.set("sort", String(searchParams.sort));
  const filterQuery = filterParams.toString();

  return (
    <>
      <PromoStrip />
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.18em] text-fog">
        <Link href="/" className="hover:text-gold">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/collections" className="hover:text-gold">Collections</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{category.title}</span>
      </nav>

      <div className="border-b border-ink/10 pb-8 pt-6 text-center">
        <p className="eyebrow text-gold">The Collection</p>
        <h1 className="mt-3 font-display text-4xl text-ink md:text-5xl">
          {category.title}
        </h1>
        {category.description && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-espresso">
            {category.description}
          </p>
        )}
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
          {items.length} pieces
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
        <CollectionFilters basePath={`/collection/${raw}`} maxPrice={maxPrice} />
        <div>
          {visible.length === 0 ? (
            <div className="border border-dashed border-ink/25 py-16 text-center">
              <p className="font-display text-xl text-ink">No pieces match</p>
              <p className="mt-1 text-sm text-fog">
                Try widening the price range.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} layoutVariant="grid" />
              ))}
            </div>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            baseUrl={
              filterQuery
                ? `/collection/${raw}?${filterQuery}`
                : `/collection/${raw}`
            }
          />
        </div>
      </div>
    </div>
    </>
  );
}
