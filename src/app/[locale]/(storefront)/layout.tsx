import { setRequestLocale } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/blocks/SiteHeader";
import { SiteFooter } from "@/components/blocks/SiteFooter";

export default async function StorefrontLayout(
  props: LayoutProps<"/[locale]">
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="min-h-[60vh]">{props.children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}
