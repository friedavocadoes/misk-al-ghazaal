import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { getBlogs, blogUrl } from "@/lib/blogs";
import { SafeImage } from "@/components/ui/safe-image";
import { toLocale } from "@/lib/i18n";
import { getPageSeo, seoMetadata } from "@/lib/seo";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const seo = await getPageSeo("blog", "");
  return {
    ...seoMetadata(
      seo,
      {
        title: "Blogs — Misk Al Ghazaal",
        description:
          "Explore fragrance notes, perfume rituals and stories from Misk Al Ghazaal.",
      },
      toLocale(locale),
    ),
    alternates: { canonical: locale === "ar" ? "/ar/posts" : "/posts" },
    ...(sp.q || sp.category || sp.page
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}
export default async function Blogs({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const sp = await searchParams;
  const [all, seo] = await Promise.all([getBlogs(), getPageSeo("blog", "")]);
  const categories = [
    ...new Map(
      all.map((p) => [p.blog_categories.slug, p.blog_categories]),
    ).values(),
  ];
  const q = (sp.q || "").trim().slice(0, 120);
  const filtered = all.filter(
    (p) =>
      (!sp.category || p.blog_categories.slug === sp.category) &&
      (!q || `${p.title} ${p.excerpt}`.toLowerCase().includes(q.toLowerCase())),
  );
  const page = Math.min(
    Math.max(1, Math.floor(Number(sp.page)) || 1),
    Math.max(1, Math.ceil(filtered.length / 12)),
  );
  const rows = filtered.slice((page - 1) * 12, page * 12);
  return (
    <div className="blog-index mx-auto max-w-7xl px-5 py-14 md:px-8">
      <p className="eyebrow text-gold">Misk Al Ghazaal</p>
      <h1 className="mt-4 text-5xl font-light">
        {(locale === "ar" ? seo?.h1Ar : seo?.h1) ||
          seo?.h1 ||
          (locale === "ar" ? "المدونة" : "Blogs")}
      </h1>
      <p className="mt-5 max-w-xl text-sm leading-7 text-fog">
        {locale === "ar"
          ? "قصص العطور، وفن اختيارها، وطقوسها اليومية."
          : "A closer look at fragrance. Notes, rituals, and the stories behind what we wear."}
      </p>
      <form
        className="my-10 grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex sm:flex-wrap"
        action={locale === "ar" ? "/ar/posts" : "/posts"}
      >
        <input
          aria-label="Search blogs"
          name="q"
          defaultValue={q}
          placeholder="Search blogs"
          className="col-span-2 min-w-0 flex-1 border border-ink/20 bg-white px-4 py-3"
        />
        <select
          aria-label="Blog category"
          name="category"
          defaultValue={sp.category || ""}
          className="min-w-0 border border-ink/20 px-4 py-3"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="bg-ink px-6 py-3 text-white">Search</button>
      </form>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <article key={p.id}>
            <Link href={blogUrl(p)}>
              {p.image && (
                <SafeImage
                  src={p.image}
                  fallback=""
                  alt={p.image_alt || p.title}
                  width={800}
                  height={600}
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                  className="aspect-[4/3] w-full object-cover"
                />
              )}
              <p className="eyebrow mt-5 text-gold">{p.blog_categories.name}</p>
              <h2 className="mt-3 text-2xl font-light">{p.title}</h2>
              <p className="mt-3 text-sm leading-7 text-fog">{p.excerpt}</p>
            </Link>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="py-16 text-center text-fog">
          {q || sp.category
            ? "No blogs match your search."
            : "Our first stories are on their way."}
        </p>
      )}
      <nav aria-label="Blog pagination" className="mt-12 flex gap-4">
        {page > 1 && (
          <Link href={{ pathname: "/posts", query: { ...sp, page: page - 1 } }}>
            ← Previous
          </Link>
        )}
        {page * 12 < filtered.length && (
          <Link href={{ pathname: "/posts", query: { ...sp, page: page + 1 } }}>
            Next →
          </Link>
        )}
      </nav>
    </div>
  );
}
