import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import {
  ProductInfo,
  ProductTabsAccordion,
} from "@/components/blocks/ProductDetails";
import { ProductCarousel } from "@/components/blocks/ProductCarousel";
import { getProduct, getProductsByCategory, products } from "@/lib/mock-data";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = getProductsByCategory(
    product.categorySlugs[0] ?? "best-sellers"
  )
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />
        <ProductInfo
          product={product}
          layout={product.template === "miskalgazaal" ? "miskalgazaal" : "standard"}
        />
      </div>
      <ProductTabsAccordion product={product} />
      <ProductCarousel title="Related Products" products={related} />
    </div>
  );
}
