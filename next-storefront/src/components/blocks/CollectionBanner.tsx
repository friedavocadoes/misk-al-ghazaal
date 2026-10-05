import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function CollectionBanner({
  title,
  description,
  count,
}: {
  title: string;
  description?: string;
  count: number;
}) {
  return (
    <div className="rounded-3xl bg-emerald-950 px-6 py-10 text-center md:py-14">
      <h1 className="text-3xl font-bold text-white md:text-4xl">{title}</h1>
      {description && (
        <p className="mx-auto mt-2 max-w-xl text-sm text-emerald-100/80">
          {description}
        </p>
      )}
      <p className="mt-3 text-xs font-medium uppercase tracking-widest text-emerald-300">
        {count} products
      </p>
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 py-16 text-center">
        <p className="font-semibold text-stone-900">No products found</p>
        <p className="mt-1 text-sm text-stone-500">
          Try a different search or collection.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
