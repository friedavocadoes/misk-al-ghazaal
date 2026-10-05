import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { CollectionFilters } from "@/components/blocks/CollectionFilters";
import { Pagination } from "@/components/ui/pagination";
import {
  collections,
  getCategory,
  getProductsByCategory,
} from "@/lib/mock-data";

// Canonical collection route (singular /collection — mirrors Shopify /collections
// handles: collection.json, collection.holy-odh.json,
// collection.ramadan-bakhoor-sale.json are one grid; the slug drives the filter).
const ALIASES: Record<string, string> = {
  "holy-odh": "holy-oudh", // Shopify template suffix used -odh spelling
  "misk-al-ghazaal-from-manufacturer": "misk-al-ghazaal",
};

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

const PAGE_SIZE = 12;

export default async function CollectionPage(
  props: PageProps<"/collection/[slug]">
) {
  const { slug: raw } = await props.params;
  const searchParams = await props.searchParams;
  const slug = ALIASES[raw] ?? raw;
  const category = getCategory(slug);
  if (!category) notFound();

  let items = getProductsByCategory(slug);
  const maxPrice = Math.max(...items.map((p) => p.price), 200);

  if (searchParams?.avail === "in") {
    items = items.filter((p) =>
      p.variants.some((v) => v.stock > 0)
    );
  }
  if (searchParams?.max) {
    const cap = Number(searchParams.max);
    if (!Number.isNaN(cap)) items = items.filter((p) => p.price <= cap);
  }
  const sort = searchParams?.sort;
  if (sort === "price-asc") items = [...items].sort((a, b) => a.price - b.price);
  if (sort === "price-desc")
    items = [...items].sort((a, b) => b.price - a.price);
  if (sort === "rating")
    items = [...items].sort((a, b) => b.rating - a.rating);

  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Keep active filters when paginating.
  const filterParams = new URLSearchParams();
  if (searchParams?.avail) filterParams.set("avail", String(searchParams.avail));
  if (searchParams?.max) filterParams.set("max", String(searchParams.max));
  if (searchParams?.sort) filterParams.set("sort", String(searchParams.sort));
  const filterQuery = filterParams.toString();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-3xl bg-emerald-950 px-6 py-10 text-center">
        <h1 className="text-3xl font-bold text-white md:text-4xl">
          {category.title}
        </h1>
        {category.description && (
          <p className="mx-auto mt-2 max-w-xl text-sm text-emerald-100/80">
            {category.description}
          </p>
        )}
        <p className="mt-3 text-xs font-medium uppercase tracking-widest text-emerald-300">
          {items.length} products
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <CollectionFilters basePath={`/collection/${raw}`} maxPrice={maxPrice} />
        <div>
          {visible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 py-16 text-center">
              <p className="font-semibold">No products match these filters</p>
              <p className="mt-1 text-sm text-stone-500">
                Try widening the price range.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
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
  );
}
