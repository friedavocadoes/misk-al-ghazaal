import { redirect } from "next/navigation";
import { getCollections } from "@/lib/store";

export async function generateStaticParams() {
  const all = await getCollections();
  return all.map((c) => ({ slug: c.slug }));
}

// Legacy plural path — canonical route is now /collection/[slug].
export default async function LegacyCollectionPage(
  props: PageProps<"/collections/[slug]">
) {
  const { slug } = await props.params;
  redirect(`/collection/${slug}`);
}
