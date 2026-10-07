import { setRequestLocale } from "next-intl/server";
import { CollectionGrid } from "@/components/blocks/CollectionBlocks";
import { getCollections } from "@/lib/store";
import { toLocale } from "@/lib/i18n";

export default async function CollectionsPage(
  props: PageProps<"/[locale]/collections">
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const collections = await getCollections();
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">The Library</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        All Collections
      </h1>
      <p className="mt-3 max-w-xl text-sm text-espresso">
        Shop by fragrance family, ritual or edit.
      </p>
      <div className="mt-10">
        <CollectionGrid categories={collections} locale={locale} />
      </div>
    </div>
  );
}
