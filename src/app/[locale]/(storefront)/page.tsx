import { Suspense } from "react";
import { HomeArrival } from "@/components/sections/HomeArrival";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
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
  InstagramFeed,
  ParallaxCTA,
  Testimonials,
} from "@/components/blocks/ContentBlocks";
import {
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
import { SeoJsonLd } from "@/components/blocks/SeoJsonLd";
import { customJsonLd, getPageSeo, seoMetadata } from "@/lib/seo";

export async function generateMetadata(
  props: PageProps<"/[locale]">,
): Promise<Metadata> {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  const seo = await getPageSeo("home");
  return seoMetadata(
    seo,
    {
      title: "Misk Al Ghazaal — Perfumes, Dukhoon & Bakhoor",
      description:
        "Authentic Misk Al Ghazaal perfumes, dukhoon and bakhoor — direct from manufacturer, delivered across the UAE.",
    },
    locale,
  );
}

/** Resolve a carousel's products: explicit admin-ordered picks win;
    otherwise the ranked collection (manual rank → sales lift → newest). */
async function carouselProducts(
  s: HomepageSection,
): Promise<ReturnType<typeof getProductsByCollection>> {
  const cfg = s.config ?? {};
  if (cfg.mode === "manual" && cfg.slugs?.length) {
    return getProductsBySlugs(cfg.slugs).then((l) =>
      l.slice(0, cfg.limit ?? 8),
    );
  }
  const items = await getProductsByCollection(cfg.collection ?? "best-sellers");
  return items.slice(0, cfg.limit ?? 8);
}

async function Section({
  s,
  locale,
  ctx,
}: {
  s: HomepageSection;
  locale: Locale;
  ctx: {
    collections: Awaited<ReturnType<typeof getCollections>>;
    brands: Awaited<ReturnType<typeof getBrandBanners>>;
    bestSellers: Awaited<ReturnType<typeof getProductsByCollection>>;
    newArrivals: Awaited<ReturnType<typeof getProductsByCollection>>;
    featured: Awaited<ReturnType<typeof getProductsByCollection>>;
  };
}) {
  const t = (v?: string, ar?: string) => tx(v || "", ar, locale);
  const ts = await getTranslations({ locale, namespace: "Sections" });
  const tc = await getTranslations({ locale, namespace: "Common" });
  const collectionHref = (slug?: string) => {
    const clean = (slug ?? "").trim();
    if (clean === "all" || ctx.collections.some((c) => c.slug === clean))
      return `/collection/${clean}`;
    return "/collection/all";
  };

  switch (s.kind) {
    case "scent_alchemist":
      return null; // Dedicated /find-your-scent experience.
    case "products_carousel": {
      const products = await carouselProducts(s);
      if (!products.length) return null;
      return (
        <ProductCarousel
          eyebrow={t(s.eyebrow, s.eyebrowAr)}
          title={t(s.title, s.titleAr)}
          products={products}
          viewAllHref={collectionHref(s.config?.collection)}
        />
      );
    }
    case "brand_split":
      return (
        <BannerSplit
          banners={ctx.brands}
          eyebrow={t(s.eyebrow, s.eyebrowAr)}
          title={t(s.title, s.titleAr)}
          ctaLabel={t(s.config?.cta, s.config?.ctaAr)}
          ctaHref={s.config?.href}
        />
      );
    case "parallax_cta":
      return (
        <ParallaxCTA
          eyebrow={t(s.eyebrow, s.eyebrowAr) || ts("bandEyebrow")}
          title={t(s.title, s.titleAr) || ts("bandTitle")}
          cta={t(s.config?.cta, s.config?.ctaAr) || ts("bandCta")}
          src={s.config?.src}
          href={s.config?.href}
        />
      );
    case "collections_grid": {
      const cats = ctx.collections.slice(0, s.config?.limit ?? 6);
      if (!cats.length) return null;
      return (
        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-22">
          <SectionHeading
            eyebrow={t(s.eyebrow, s.eyebrowAr)}
            title={t(s.title, s.titleAr)}
            link={{ label: tc("viewAll"), href: "/collections" }}
          />
          <CollectionGrid categories={cats} locale={locale} />
        </section>
      );
    }
    case "product_tabs": {
      const trending = ctx.featured.filter((p) => p.featured);
      return (
        <ProductTabs
          eyebrow={t(s.eyebrow, s.eyebrowAr)}
          title={t(s.title, s.titleAr) || ts("trending")}
          tabs={[
            {
              label: ts("tabBest"),
              value: "best",
              products: ctx.bestSellers,
              href: "/collection/best-sellers",
            },
            {
              label: ts("tabNew"),
              value: "new",
              products: ctx.newArrivals,
              href: "/collection/new-arrivals",
            },
            {
              label: ts("tabFeatured"),
              value: "featured",
              products: trending,
              href: "/collection/all",
            },
          ]}
        />
      );
    }
    case "story":
      return (
        <StoryBlock
          eyebrow={t(s.eyebrow, s.eyebrowAr)}
          title={t(s.title, s.titleAr)}
          config={s.config}
        />
      );
    case "dual_feature":
      return <DualFeature config={s.config} />;
    case "testimonials":
      return (
        <Testimonials
          items={getTestimonials(locale)}
          eyebrow={t(s.eyebrow, s.eyebrowAr) || ts("testiEyebrow")}
          title={t(s.title, s.titleAr) || ts("testiTitle")}
        />
      );
    case "blog_grid":
      return null; // Blog discovery is footer-only.
    case "instagram":
      return (
        <InstagramFeed
          eyebrow={t(s.eyebrow, s.eyebrowAr) || "@gazaalperfumes"}
          title={t(s.title, s.titleAr) || ts("instaTitle")}
        />
      );
    case "image_banner": {
      const cfg = s.config ?? {};
      if (!cfg.src) return null;
      return (
        <section className="mx-auto max-w-7xl px-5 md:px-8">
          <ImageBanner
            src={cfg.src}
            href={cfg.href}
            title={t(cfg.title, s.titleAr)}
            cta={t(cfg.cta, cfg.ctaAr)}
          />
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
  return (
    <>
      <Suspense
        fallback={
          <div className="home-hero-pending">
            <ArrivalMark />
          </div>
        }
      >
        <HomeHero />
      </Suspense>
      <Suspense
        fallback={
          <div className="mx-auto h-64 max-w-7xl animate-pulse bg-sand/40" />
        }
      >
        <HomeContent locale={locale} />
      </Suspense>
    </>
  );
}

function ArrivalMark() {
  return (
    <div className="arrival-mark">
      <img src="/mag.webp" width="80" height="80" alt="Misk Al Ghazaal" />
      <span>Misk Al Ghazaal</span>
      <small>PERFUMESS</small>
      <i />
    </div>
  );
}

async function HomeHero() {
  const slides = await getHeroSlides();
  return (
    <>
      <HomeArrival />
      <HeroSlider slides={slides} />
    </>
  );
}

async function HomeContent({ locale }: { locale: Locale }) {
  const [sections, brands, collections, bestSellers, newArrivals, featured] =
    await Promise.all([
      getHomepageSections(),
      getBrandBanners(),
      getCollections(),
      getProductsByCollection("best-sellers"),
      getProductsByCollection("new-arrivals"),
      getProductsByCollection("best-sellers"),
    ]);

  const ctx = {
    collections,
    brands,
    bestSellers,
    newArrivals,
    featured,
  };
  if (!sections.length) {
    const ts = await getTranslations({ locale, namespace: "Sections" });
    const tc = await getTranslations({ locale, namespace: "Common" });
    const trending = featured.filter((p) => p.featured);
    return (
      <>
        <HomeSeo locale={locale} />
        <ProductCarousel
          eyebrow={ts("bestEyebrow")}
          title={ts("bestTitle")}
          products={bestSellers.slice(0, 8)}
          viewAllHref="/collection/best-sellers"
        />
        <BannerSplit banners={brands} />
        <ProductCarousel
          eyebrow={ts("newEyebrow")}
          title={ts("newTitle")}
          products={newArrivals.slice(0, 8)}
          viewAllHref="/collection/new-arrivals"
        />
        <ParallaxCTA
          eyebrow={ts("bandEyebrow")}
          title={ts("bandTitle")}
          cta={ts("bandCta")}
        />
        <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-22">
          <SectionHeading
            eyebrow={ts("libraryEyebrow")}
            title={ts("libraryTitle")}
            link={{ label: tc("viewAll"), href: "/collections" }}
          />
          <CollectionGrid
            categories={collections.slice(0, 6)}
            locale={locale}
          />
        </section>
        <ProductTabs
          title={ts("trending")}
          tabs={[
            {
              label: ts("tabBest"),
              value: "best",
              products: bestSellers,
              href: "/collection/best-sellers",
            },
            {
              label: ts("tabNew"),
              value: "new",
              products: newArrivals,
              href: "/collection/new-arrivals",
            },
            {
              label: ts("tabFeatured"),
              value: "featured",
              products: trending,
              href: "/collection/all",
            },
          ]}
        />
        <StoryBlock />
        <DualFeature />
        <Testimonials
          items={getTestimonials(locale)}
          eyebrow={ts("testiEyebrow")}
          title={ts("testiTitle")}
        />
        <InstagramFeed eyebrow={ts("instaEyebrow")} title={ts("instaTitle")} />
      </>
    );
  }

  return (
    <>
      <HomeSeo locale={locale} />
      {sections.map((s) => (
        <Suspense
          key={s.id}
          fallback={<div className="h-64 animate-pulse bg-sand/30" />}
        >
          <Section s={s} locale={locale} ctx={ctx} />
        </Suspense>
      ))}
    </>
  );
}

async function HomeSeo({ locale }: { locale: Locale }) {
  const seo = await getPageSeo("home");
  const h1 = tx(seo?.h1 ?? "", seo?.h1Ar, locale);
  return (
    <>
      <SeoJsonLd blocks={customJsonLd(seo)} />
      {h1 && <h1 className="sr-only">{h1}</h1>}
    </>
  );
}
