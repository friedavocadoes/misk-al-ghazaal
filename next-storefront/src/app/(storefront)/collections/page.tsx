import { CollectionGrid } from "@/components/blocks/CollectionBlocks";
import { categories } from "@/lib/mock-data";

export default function CollectionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-900">All Collections</h1>
      <p className="mt-2 text-sm text-stone-500">
        Shop by fragrance family, ritual or edit.
      </p>
      <div className="mt-6">
        <CollectionGrid categories={categories} />
      </div>
    </div>
  );
}
