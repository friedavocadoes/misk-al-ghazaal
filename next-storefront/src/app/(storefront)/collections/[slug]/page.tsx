import { redirect } from "next/navigation";
import { collections } from "@/lib/mock-data";

export function generateStaticParams() {
  return collections.map((c) => ({ slug: c.slug }));
}

// Legacy plural path — canonical route is now /collection/[slug].
export default async function LegacyCollectionPage(
  props: PageProps<"/collections/[slug]">
) {
  const { slug } = await props.params;
  redirect(`/collection/${slug}`);
}
