import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      {eyebrow && <p className="eyebrow text-gold">{eyebrow}</p>}
      <h2 className="mt-2.5 font-display text-3xl text-ink md:text-4xl">
        {link ? (
          <Link href={link.href} className="transition-colors hover:text-gold">
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
          ? "mb-10 text-center"
          : "mb-8 flex items-end justify-between gap-4"
      }
    >
      <div className={align === "center" ? "mx-auto" : undefined}>
        {titleNode}
      </div>
      {link && (
        <Link
          href={link.href}
          className="link-underline shrink-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink"
        >
          {link.label}
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
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        link={viewAllHref ? { label: t("viewAll"), href: viewAllHref } : undefined}
      />
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
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
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16">
      <SectionHeading eyebrow={eyebrow} title={title} align="center" />
      <Tabs defaultValue={tabs[0]?.value} className="mt-2">
        <TabsList className="flex justify-center">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {tab.products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {tab.href && (
              <div className="mt-8 text-center">
                <Link
                  href={tab.href}
                  className="link-underline text-[12px] font-semibold uppercase tracking-[0.18em] text-ink"
                >
                  {tc("viewAll")} · {tab.label}
                </Link>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
