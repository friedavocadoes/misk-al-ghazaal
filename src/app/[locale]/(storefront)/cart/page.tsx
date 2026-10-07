import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import {
  CartLineItems,
  CartSummary,
  TrendingUpsell,
} from "@/components/blocks/CartBlocks";
import { getProductBySlug, getProductsByCollection } from "@/lib/store";

// Demo bag until Phase 2 checkout state lands.
const DEMO_CART = [
  { productSlug: "misk-al-ghazaal-abukhalid-50ml", qty: 1 },
  {
    productSlug: "jawahara-from-misk-al-ghazal-bakhoor-tablets-arabic-insence",
    qty: 2,
  },
];

export default async function CartPage(props: PageProps<"/[locale]/cart">) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Cart" });
  const lines = (
    await Promise.all(
      DEMO_CART.map(async (l) => ({
        product: await getProductBySlug(l.productSlug),
        qty: l.qty,
      }))
    )
  ).flatMap((l) => (l.product ? [{ product: l.product, qty: l.qty }] : []));
  const subtotal = lines.reduce((s, l) => s + l.product!.price * l.qty, 0);
  const trending = await getProductsByCollection("best-sellers");

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        {t("title")}
      </h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <CartLineItems lines={lines} locale={locale} />
        <CartSummary subtotal={subtotal} locale={locale} />
      </div>
      <TrendingUpsell products={trending} />
    </div>
  );
}
