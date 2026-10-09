import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCollections } from "@/lib/store";

export async function generateStaticParams() {
  const all = await getCollections();
  return all.map((c) => ({ slug: c.slug }));
}

// Legacy plural path — canonical route is now /collection/[slug].
export default async function LegacyCollectionPage(
  props: PageProps<"/[locale]/collections/[slug]">
) {
  const { slug, locale } = await props.params;
  setRequestLocale(locale);
  redirect({ href: `/collection/${slug}`, locale });
}
