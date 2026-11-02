import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getOriginalesProducts } from "@/features/originales/data";
import { OriginalesChrome } from "@/features/originales/OriginalesChrome";
import { OriginalesLoading } from "@/features/originales/OriginalesLoading";
import { ORIGINALES_ENABLED } from "@/features/originales/config";
import { Manrope } from "next/font/google";
import "@/features/originales/portal.css";
const atelierFont = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-originales",
});

export default async function OriginalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!ORIGINALES_ENABLED) notFound();
  const products = await getOriginalesProducts();
  return (
    <Suspense fallback={<OriginalesLoading />}>
      <OriginalesChrome
        products={products}
        fontClassName={atelierFont.variable}
      >
        {children}
      </OriginalesChrome>
    </Suspense>
  );
}
