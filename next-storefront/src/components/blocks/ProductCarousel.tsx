import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SectionHeading({
  eyebrow,
  title,
  link,
}: {
  eyebrow?: string;
  title: string;
  link?: { label: string; href: string };
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-2xl font-bold text-stone-900">{title}</h2>
      </div>
      {link && (
        <Link
          href={link.href}
          className="text-sm font-semibold text-emerald-900 underline-offset-4 hover:underline"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

export function ProductCarousel({
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
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        link={viewAllHref ? { label: "View all", href: viewAllHref } : undefined}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

export function ProductTabs({
  eyebrow,
  title,
  tabs,
}: {
  eyebrow?: string;
  title: string;
  tabs: { label: string; value: string; products: Product[] }[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <Tabs defaultValue={tabs[0]?.value}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {t.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
