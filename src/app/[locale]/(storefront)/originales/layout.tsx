import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getOriginalesProducts } from "@/features/originales/data";
import { OriginalesChrome } from "@/features/originales/OriginalesChrome";
import { ORIGINALES_ENABLED } from "@/features/originales/config";

export default async function OriginalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!ORIGINALES_ENABLED) notFound();
  const products = await getOriginalesProducts();
  return (
    <Suspense fallback={null}>
      <OriginalesChrome products={products}>{children}</OriginalesChrome>
    </Suspense>
  );
}
