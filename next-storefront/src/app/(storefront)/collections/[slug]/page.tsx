import { notFound } from "next/navigation";
import {
  CollectionBanner,
  ProductGrid,
} from "@/components/blocks/CollectionBanner";
import { Pagination } from "@/components/ui/pagination";
import {
  categories,
  getCategory,
  getProductsByCategory,
} from "@/lib/mock-data";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

const PAGE_SIZE = 12;

export default async function CollectionPage(
  props: PageProps<"/collections/[slug]">
) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const category = getCategory(slug);
  if (!category) notFound();

  const all = getProductsByCategory(slug);
  const page = Math.max(1, Number(searchParams?.page ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <CollectionBanner
        title={category.title}
        description={category.description}
        count={all.length}
      />
      <div className="mt-8">
        <ProductGrid products={items} />
        <Pagination
          page={page}
          totalPages={totalPages}
          baseUrl={`/collections/${slug}`}
        />
      </div>
    </div>
  );
}
