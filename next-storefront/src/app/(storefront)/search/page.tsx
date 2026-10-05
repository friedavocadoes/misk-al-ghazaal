import { ProductGrid } from "@/components/blocks/CollectionBanner";
import { searchCatalog } from "@/lib/store";

export default async function SearchPage(
  props: PageProps<"/search">
) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const results = await searchCatalog(q);

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <p className="eyebrow text-gold">Search</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        {q ? `“${q}”` : "Search the Maison"}
      </h1>
      <p className="mt-3 text-sm text-fog">
        {q
          ? `${results.length} ${results.length === 1 ? "piece" : "pieces"} found`
          : "Try “misk”, “oudh”, “bakhoor”…"}
      </p>
      <div className="mt-10">
        <ProductGrid products={results} />
      </div>
    </div>
  );
}
