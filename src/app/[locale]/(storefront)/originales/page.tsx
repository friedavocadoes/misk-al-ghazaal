import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import { getOriginalesProducts } from "@/features/originales/data";
import { OriginalesGallery } from "@/features/originales/OriginalesGallery";
import { Suspense } from "react";
import { getProductRetailStores } from "@/lib/retail-stores";
import { RetailStoresSection } from "@/components/product/FindInStore";
import s from "@/features/originales/originales.module.css";

async function CollectionStores({ locale }: { locale: string }) {
  const products = await getOriginalesProducts();
  const stores = (
    await Promise.all(products.map((p) => getProductRetailStores(p.id)))
  ).flat();
  const unique = [
    ...new Map(stores.map((store) => [store.id, store])).values(),
  ];
  return (
    <div className={s.extras}>
      <RetailStoresSection stores={unique} ar={locale === "ar"} />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return {
    title: "Originales — MAG Parfum",
    description:
      "Four signatures. Four worlds. Discover Ambrato, Sultanic, Lustra and Lazvaro. Originales by MAG Parfum.",
    alternates: {
      canonical: `${locale === "ar" ? "/ar" : ""}/originales`,
      languages: { en: "/originales", ar: "/ar/originales" },
    },
  };
}
export default async function OriginalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  return (
    <>
      <OriginalesGallery
        products={await getOriginalesProducts()}
        locale={locale}
      />
      <Suspense fallback={null}>
        <CollectionStores locale={locale} />
      </Suspense>
    </>
  );
}
