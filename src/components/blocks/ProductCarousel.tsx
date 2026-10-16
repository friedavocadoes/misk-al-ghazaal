import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCarouselClient } from "./ProductCarouselClient";

export function SectionHeading({
  eyebrow,
  title,
  link,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  link?: { label: string; href: string };
  align?: "left" | "center";
}) {
  const titleNode = (
    <>
      {eyebrow && (
        <p
          className={`eyebrow flex items-center gap-3 text-gold ${
            align === "center" ? "justify-center" : ""
          }`}
        >
          <span className="inline-block h-px w-8 bg-gold/70" />
          {eyebrow}
          {align === "center" && (
            <span className="inline-block h-px w-8 bg-gold/70" />
          )}
        </p>
      )}
      <h2 className="mt-2.5 font-display text-3xl leading-tight text-ink md:text-4xl lg:text-[2.65rem]">
        {link ? (
          <Link
            href={link.href}
            className="transition-colors duration-300 hover:text-gold"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
    </>
  );
  return (
    <div
      className={
        align === "center"
          ? "mb-12 text-center"
          : "mb-10 flex flex-col items-start justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end"
      }
    >
      <div className={align === "center" ? "mx-auto" : undefined}>
        {titleNode}
      </div>
      {link && align !== "center" && (
        <Link
          href={link.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition hover:text-gold"
        >
          <span>{link.label}</span>
          <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </div>
  );
}

export async function ProductCarousel({
  eyebrow,
  title,
  products,
  viewAllHref,
}: {
  eyebrow?: string;
  title: string;
  products: Product[];
  viewAllHref?: string;
}) {
  const t = await getTranslations("Common");
  return (
    <ProductCarouselClient
      eyebrow={eyebrow}
      title={title}
      products={products}
      viewAllHref={viewAllHref}
      viewAllLabel={t("viewAll")}
    />
  );
}

export async function ProductTabs({
  eyebrow,
  title,
  tabs,
}: {
  eyebrow?: string;
  title: string;
  tabs: { label: string; value: string; products: Product[]; href?: string }[];
}) {
  const tc = await getTranslations("Common");
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-22">
      <SectionHeading
        eyebrow={eyebrow || "Curated Selection"}
        title={title}
        align="center"
      />
      <Tabs defaultValue={tabs[0]?.value} className="mt-4">
        <TabsList className="mx-auto flex w-fit justify-center border-b border-ink/10 bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] data-[state=active]:border-b-2 data-[state=active]:border-gold data-[state=active]:text-ink"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="animate-luxury-reveal mt-10"
          >
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {tab.products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {tab.href && (
              <div className="mt-12 text-center">
                <Link
                  href={tab.href}
                  className="group inline-flex items-center gap-2 border border-ink/20 bg-cream px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition-all duration-300 hover:border-gold hover:bg-gold-wash"
                >
                  <span>
                    {tc("viewAll")} · {tab.label}
                  </span>
                  <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
