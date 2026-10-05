import { HeroCarousel } from "@/components/blocks/HeroCarousel";
import { CategoryTiles, ShopByBrands } from "@/components/blocks/CollectionBlocks";
import {
  ProductCarousel,
  ProductTabs,
} from "@/components/blocks/ProductCarousel";
import {
  BlogCardGrid,
  InstagramFeed,
  ParallaxCTA,
  Testimonials,
} from "@/components/blocks/ContentBlocks";
import {
  articles,
  categories,
  getProductsByCategory,
  products,
} from "@/lib/mock-data";

export default function HomePage() {
  const bestSellers = getProductsByCategory("best-sellers");
  const newArrivals = getProductsByCategory("new-arrivals");
  const trending = products.filter((p) => p.featured);

  return (
    <>
      <HeroCarousel />
      <CategoryTiles categories={categories} />
      <ShopByBrands categories={categories} />
      <ProductCarousel
        eyebrow="Don't miss out"
        title="Best Offers"
        products={bestSellers}
        viewAllHref="/collections/best-sellers"
      />
      <ParallaxCTA />
      <ProductCarousel
        eyebrow="New season"
        title="New Arrivals"
        products={newArrivals}
        viewAllHref="/collections/new-arrivals"
      />
      <ProductTabs
        eyebrow=""
        title="Trending Products"
        tabs={[
          { label: "Best Sellers", value: "best", products: bestSellers },
          { label: "New Arrivals", value: "new", products: newArrivals },
          { label: "Featured", value: "featured", products: trending },
        ]}
      />
      <Testimonials />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-2xl font-bold text-stone-900">Latest Blog</h2>
        <BlogCardGrid articles={articles} />
      </section>
      <InstagramFeed />
    </>
  );
}
