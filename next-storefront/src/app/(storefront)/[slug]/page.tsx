import { redirect } from "next/navigation";

// Legacy top-level pretty path — canonical info route is now /pages/[slug].
export default async function LegacyStaticPage(
  props: PageProps<"/[slug]">
) {
  const { slug } = await props.params;
  redirect(`/pages/${slug}`);
}
