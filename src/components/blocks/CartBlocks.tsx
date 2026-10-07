import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { formatAED } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/ProductCard";

export interface CartLine {
  product: Product;
  qty: number;
}

export async function CartLineItems({
  lines,
  locale,
}: {
  lines: CartLine[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Cart" });
  if (lines.length === 0) {
    return (
      <div className="border border-dashed border-ink/25 py-16 text-center">
        <p className="font-display text-xl text-ink">{t("empty")}</p>
        <Button asChild className="mt-5">
          <Link href="/collections">{t("continue")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
      {lines.map(({ product, qty }) => (
        <li key={product.slug} className="flex gap-5 p-5">
          <Link
            href={`/product/${product.slug}`}
            className="relative block h-28 w-24 shrink-0 overflow-hidden bg-sand"
          >
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          </Link>
          <div className="flex flex-1 flex-col">
            <Link
              href={`/product/${product.slug}`}
              className="text-sm font-medium text-ink hover:text-gold"
            >
              {product.title}
            </Link>
            <p className="mt-1 text-[13px] text-fog">{t("qty")} {qty}</p>
            <p className="mt-auto flex items-center justify-between">
              <span className="font-display text-lg text-ink">
                {formatAED(product.price * qty)}
              </span>
              <button
                className="p-1 text-fog transition hover:text-[#9c2b2e]"
                aria-label={`${t("remove")} ${product.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function CartSummary({
  subtotal,
  locale,
}: {
  subtotal: number;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Cart" });
  const shipping = subtotal >= 400 ? 0 : 26;
  return (
    <aside className="h-fit border border-ink/10 bg-white p-6">
      <h2 className="font-display text-xl text-ink">{t("summary")}</h2>
      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-fog">{t("subtotal")}</dt>
          <dd className="font-medium text-ink">{formatAED(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-fog">{t("shipping")}</dt>
          <dd className="font-medium text-ink">
            {shipping === 0 ? t("free") : formatAED(shipping)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-ink/10 pt-4">
          <dt className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ink">
            {t("total")}
          </dt>
          <dd className="font-display text-xl text-ink">
            {formatAED(subtotal + shipping)}
          </dd>
        </div>
      </dl>
      <Button className="mt-6 w-full" size="lg">
        {t("checkout")}
      </Button>
      <p className="mt-3 text-center text-[11px] text-fog">
        {t("checkoutNote")}
      </p>
    </aside>
  );
}

export function TrendingUpsell({ products }: { products: Product[] }) {
  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl text-ink md:text-3xl">
        Complete the Ritual
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
