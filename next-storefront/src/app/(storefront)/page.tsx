import { HeroSlider } from "@/components/sections/HeroSlider";
import { BannerSplit } from "@/components/sections/BannerSplit";
import { StoryBlock } from "@/components/sections/StoryBlock";
import { DualFeature } from "@/components/sections/DualFeature";
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
  getArticles,
  getBrandBanners,
  getCollections,
  getHeroSlides,
  getProductsByCollection,
} from "@/lib/store";
import { getTestimonials } from "@/lib/site";

export default async function HomePage() {
  const [slides, brands, collections, bestSellers, newArrivals, featured, articles] =
    await Promise.all([
      getHeroSlides(),
      getBrandBanners(),
      getCollections(),
      getProductsByCollection("best-sellers"),
      getProductsByCollection("new-arrivals"),
      getProductsByCollection("best-sellers"),
      getArticles(),
    ]);
  const trending = featured.filter((p) => p.featured);

  return (
    <>
      <HeroSlider slides={slides} />

      <ProductCarousel
        eyebrow="The Icons"
        title="Best Sellers"
        products={bestSellers}
        viewAllHref="/collection/best-sellers"
      />
      <BannerSplit banners={brands} />
      <ProductCarousel
        eyebrow="Just Landed"
        title="New Arrivals"
        products={newArrivals}
        viewAllHref="/collection/new-arrivals"
      />
      <ParallaxCTA />

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
        <SectionHeading eyebrow="The Library" title="Shop by Ritual" />
        <CollectionGrid categories={collections.slice(0, 6)} />
      </section>

      <ProductTabs
        title="Trending Now"
        tabs={[
          { label: "Best Sellers", value: "best", products: bestSellers },
          { label: "New Arrivals", value: "new", products: newArrivals },
          { label: "Featured", value: "featured", products: trending },
        ]}
      />
      <StoryBlock />
      <DualFeature />
      <Testimonials items={getTestimonials()} />
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
        <SectionHeading eyebrow="Journal" title="Notes on Scent" />
        <BlogCardGrid articles={articles} />
      </section>
      <InstagramFeed />
    </>
  );
}
