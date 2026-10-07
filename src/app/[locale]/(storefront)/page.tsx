import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
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
import { toLocale } from "@/lib/i18n";

export default async function HomePage(props: PageProps<"/[locale]">) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Sections" });
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
        eyebrow={t("bestEyebrow")}
        title={t("bestTitle")}
        products={bestSellers}
        viewAllHref="/collection/best-sellers"
      />
      <BannerSplit banners={brands} />
      <ProductCarousel
        eyebrow={t("newEyebrow")}
        title={t("newTitle")}
        products={newArrivals}
        viewAllHref="/collection/new-arrivals"
      />
      <ParallaxCTA
        eyebrow={t("bandEyebrow")}
        title={t("bandTitle")}
        cta={t("bandCta")}
      />

      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
        <SectionHeading eyebrow={t("libraryEyebrow")} title={t("libraryTitle")} />
        <CollectionGrid categories={collections.slice(0, 6)} locale={locale} />
      </section>

      <ProductTabs
        title={t("trending")}
        tabs={[
          { label: t("tabBest"), value: "best", products: bestSellers },
          { label: t("tabNew"), value: "new", products: newArrivals },
          { label: t("tabFeatured"), value: "featured", products: trending },
        ]}
      />
      <StoryBlock />
      <DualFeature />
      <Testimonials
        items={getTestimonials(locale)}
        eyebrow={t("testiEyebrow")}
        title={t("testiTitle")}
      />
      <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
        <SectionHeading eyebrow={t("journalEyebrow")} title={t("journalTitle")} />
        <BlogCardGrid articles={articles} />
      </section>
      <InstagramFeed eyebrow={t("instaEyebrow")} title={t("instaTitle")} />
    </>
  );
}
