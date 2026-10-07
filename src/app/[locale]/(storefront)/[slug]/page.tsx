import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

// Legacy top-level pretty path — canonical info route is now /pages/[slug].
export default async function LegacyStaticPage(
  props: PageProps<"/[locale]/[slug]">
) {
  const { slug, locale } = await props.params;
  setRequestLocale(locale);
  redirect(`/${locale}/pages/${slug}`);
}
