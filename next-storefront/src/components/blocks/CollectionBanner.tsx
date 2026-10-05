import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

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
    <div className="border-b border-ink/10 pb-8 pt-4 text-center">
      <p className="eyebrow text-gold">The Collection</p>
      <h1 className="mt-3 font-display text-4xl text-ink md:text-5xl">{title}</h1>
      {description && (
        <p className="mx-auto mt-3 max-w-xl text-sm text-espresso">
          {description}
        </p>
      )}
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">
        {count} pieces
      </p>
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="border border-dashed border-ink/25 py-16 text-center">
        <p className="font-display text-xl text-ink">No pieces found</p>
        <p className="mt-1 text-sm text-fog">
          Try a different search or collection.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} layoutVariant="grid" />
      ))}
    </div>
  );
}
