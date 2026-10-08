import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import { BagView, TrendingUpsell } from "@/components/blocks/CartBlocks";
import { ProductCarousel } from "@/components/blocks/ProductCarousel";
import { getProductsByCollection } from "@/lib/store";

export default async function CartPage(props: PageProps<"/[locale]/cart">) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Cart" });
  const trending = await getProductsByCollection("best-sellers");

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        {t("title")}
      </h1>
      <div className="mt-8">
        <BagView />
      </div>
      <TrendingUpsell products={trending} />
    </div>
  );
}
