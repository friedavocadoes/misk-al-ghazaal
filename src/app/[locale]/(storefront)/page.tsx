import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { HeroSlider } from "@/components/sections/HeroSlider";
import { BannerSplit } from "@/components/sections/BannerSplit";
import { StoryBlock } from "@/components/sections/StoryBlock";
import { DualFeature } from "@/components/sections/DualFeature";
import { ImageBanner } from "@/components/sections/ImageBanner";
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
  getHomepageSections,
  getProductsByCollection,
  getProductsBySlugs,
  type HomepageSection,
} from "@/lib/store";
import { getTestimonials } from "@/lib/site";
import { toLocale, tx } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";

/** Resolve a carousel's products: explicit admin-ordered picks win;
    otherwise the ranked collection (manual rank → sales lift → newest). */
async function carouselProducts(s: HomepageSection): Promise<ReturnType<typeof getProductsByCollection>> {
  const cfg = s.config ?? {};
  if (cfg.mode === "manual" && cfg.slugs?.length) {
    return getProductsBySlugs(cfg.slugs).then((l) => l.slice(0, cfg.limit ?? 8));
  }
  const items = await getProductsByCollection(cfg.collection ?? "best-sellers");
  return items.slice(0, cfg.limit ?? 8);
}

async function Section({ s, locale, ctx }: {
  s: HomepageSection;
  locale: Locale;
  ctx: {
    collections: Awaited<ReturnType<typeof getCollections>>;
    brands: Awaited<ReturnType<typeof getBrandBanners>>;
    bestSellers: Awaited<ReturnType<typeof getProductsByCollection>>;
    newArrivals: Awaited<ReturnType<typeof getProductsByCollection>>;
    featured: Awaited<ReturnType<typeof getProductsByCollection>>;
    articles: Awaited<ReturnType<typeof getArticles>>;
  };
}) {
  const t = (v: string, ar?: string) => tx(v || "", ar, locale);
  const ts = await getTranslations({ locale, namespace: "Sections" });
  switch (s.kind) {
    case "products_carousel": {
      const products = await carouselProducts(s);
      if (!products.length) return null;
      return (
        <ProductCarousel
          eyebrow={t(s.eyebrow)}
          title={t(s.title)}
          products={products}
        />
      );
    }
    case "brand_split":
      return <BannerSplit banners={ctx.brands} />;
    case "parallax_cta":
      return (
        <ParallaxCTA
          eyebrow={t(s.eyebrow) || ts("bandEyebrow")}
          title={t(s.title) || ts("bandTitle")}
          cta={t(s.config?.cta ?? "") || ts("bandCta")}
        />
      );
    case "collections_grid": {
      const cats = ctx.collections.slice(0, s.config?.limit ?? 6);
      if (!cats.length) return null;
      return (
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
          <SectionHeading eyebrow={t(s.eyebrow)} title={t(s.title)} />
          <CollectionGrid categories={cats} locale={locale} />
        </section>
      );
    }
    case "product_tabs": {
      const trending = ctx.featured.filter((p) => p.featured);
      return (
        <ProductTabs
          title={t(s.title) || ts("trending")}
          tabs={[
            { label: ts("tabBest"), value: "best", products: ctx.bestSellers },
            { label: ts("tabNew"), value: "new", products: ctx.newArrivals },
            { label: ts("tabFeatured"), value: "featured", products: trending },
          ]}
        />
      );
    }
    case "story":
      return <StoryBlock />;
    case "dual_feature":
      return <DualFeature />;
    case "testimonials":
      return <Testimonials items={getTestimonials(locale)} eyebrow={t(s.eyebrow)} title={t(s.title)} />;
    case "blog_grid": {
      const articles = ctx.articles.slice(0, s.config?.limit ?? 3);
      if (!articles.length) return null;
      return (
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
          <SectionHeading eyebrow={t(s.eyebrow)} title={t(s.title)} />
          <BlogCardGrid articles={articles} />
        </section>
      );
    }
    case "instagram":
      return <InstagramFeed eyebrow={t(s.eyebrow) || "@misk.al.ghazaal"} title={t(s.title)} />;
    case "image_banner": {
      const cfg = s.config ?? {};
      if (!cfg.src) return null;
      return (
        <section className="mx-auto max-w-7xl px-5 md:px-8">
          <ImageBanner src={cfg.src} href={cfg.href} title={t(cfg.title ?? "")} cta={t(cfg.cta ?? "", cfg.ctaAr)} />
        </section>
      );
    }
    default:
      return null;
  }
}

export default async function HomePage(props: PageProps<"/[locale]">) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const [slides, sections, brands, collections, bestSellers, newArrivals, featured, articles] =
    await Promise.all([
      getHeroSlides(),
      getHomepageSections(),
      getBrandBanners(),
      getCollections(),
      getProductsByCollection("best-sellers"),
      getProductsByCollection("new-arrivals"),
      getProductsByCollection("best-sellers"),
      getArticles(),
    ]);

  const ctx = { collections, brands, bestSellers, newArrivals, featured, articles };
  if (!sections.length) {
    // Pre-migration (or empty CMS): the classic composition, so the home
    // never renders bare. Disappears the moment sections exist.
    const ts = await getTranslations({ locale, namespace: "Sections" });
    const trending = featured.filter((p) => p.featured);
    return (
      <>
        <HeroSlider slides={slides} />
        <ProductCarousel eyebrow={ts("bestEyebrow")} title={ts("bestTitle")} products={bestSellers.slice(0, 8)} />
        <BannerSplit banners={brands} />
        <ProductCarousel eyebrow={ts("newEyebrow")} title={ts("newTitle")} products={newArrivals.slice(0, 8)} />
        <ParallaxCTA eyebrow={ts("bandEyebrow")} title={ts("bandTitle")} cta={ts("bandCta")} />
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
          <SectionHeading eyebrow={ts("libraryEyebrow")} title={ts("libraryTitle")} />
          <CollectionGrid categories={collections.slice(0, 6)} locale={locale} />
        </section>
        <ProductTabs
          title={ts("trending")}
          tabs={[
            { label: ts("tabBest"), value: "best", products: bestSellers },
            { label: ts("tabNew"), value: "new", products: newArrivals },
            { label: ts("tabFeatured"), value: "featured", products: trending },
          ]}
        />
        <StoryBlock />
        <DualFeature />
        <Testimonials
          items={getTestimonials(locale)}
          eyebrow={ts("testiEyebrow")}
          title={ts("testiTitle")}
        />
        <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
          <SectionHeading eyebrow={ts("journalEyebrow")} title={ts("journalTitle")} />
          <BlogCardGrid articles={articles.slice(0, 3)} />
        </section>
        <InstagramFeed eyebrow={ts("instaEyebrow")} title={ts("instaTitle")} />
      </>
    );
  }
  return (
    <>
      <HeroSlider slides={slides} />
      {sections.map((s) => (
        <Section key={s.id} s={s} locale={locale} ctx={ctx} />
      ))}
    </>
  );
}
