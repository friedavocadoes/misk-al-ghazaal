import { ProductGrid } from "@/components/blocks/CollectionBanner";
import { searchProducts } from "@/lib/mock-data";

export default async function SearchPage(
  props: PageProps<"/search">
) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const results = searchProducts(q);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-900">
        {q ? `Results for “${q}”` : "Search"}
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        {q ? `${results.length} products found` : "Try “misk”, “oudh”, “bakhoor”…"}
      </p>
      <div className="mt-6">
        <ProductGrid products={results} />
      </div>
    </div>
  );
}
