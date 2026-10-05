import { HeroSlider } from "@/components/sections/HeroSlider";
import { BannerSplit } from "@/components/sections/BannerSplit";
import { StoryBlock } from "@/components/sections/StoryBlock";
import { CollectionGrid } from "@/components/blocks/CollectionBlocks";
import {
  ProductCarousel,
  ProductTabs,
  SectionHeading,
} from "@/components/blocks/ProductCarousel";
import {
  BlogCardGrid,
  InstagramFeed,
  ParallaxCTA,
  Testimonials,
} from "@/components/blocks/ContentBlocks";
import {
  articles,
  brandBanners,
  collections,
  getProductsByCategory,
  heroSlides,
  products,
} from "@/lib/mock-data";

export default function HomePage() {
  const bestSellers = getProductsByCategory("best-sellers");
  const newArrivals = getProductsByCategory("new-arrivals");
  const featured = products.filter((p) => p.featured);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <HeroSlider slides={heroSlides} />
      </div>

      {/* FeaturedShelves (Ishi_featured_product_style1/2 → product_tab blocks) */}
      <ProductCarousel
        eyebrow="Don't miss out"
        title="Best Offers"
        products={bestSellers}
        viewAllHref="/collection/best-sellers"
      />
      <BannerSplit banners={brandBanners} />
      <ProductCarousel
        eyebrow="New season"
        title="New Arrivals"
        products={newArrivals}
        viewAllHref="/collection/new-arrivals"
      />
      <ParallaxCTA />

      {/* CategoryGrid (Ishi_serviceblock + Ishi_collection_list) */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeading title="Our Products" />
        <CollectionGrid categories={collections.slice(0, 6)} />
      </section>

      <ProductTabs
        eyebrow=""
        title="Trending Products"
        tabs={[
          { label: "Best Sellers", value: "best", products: bestSellers },
          { label: "New Arrivals", value: "new", products: newArrivals },
          { label: "Featured", value: "featured", products: featured },
        ]}
      />
      <StoryBlock />
      <Testimonials />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-2xl font-bold text-stone-900">Latest Blog</h2>
        <BlogCardGrid articles={articles} />
      </section>
      <InstagramFeed />
    </>
  );
}
