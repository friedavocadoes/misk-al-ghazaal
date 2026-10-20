import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getBlogs,
  getBlog,
  getBlogRedirect,
  blogUrl,
  blogContent,
} from "@/lib/blogs";
import { SafeImage } from "@/components/ui/safe-image";
import { toLocale } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
type Props = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug, locale } = await params;
  const p = await getBlog(category, slug);
  if (!p) return {};
  const url = `${locale === "ar" ? "/ar" : ""}${blogUrl(p)}`;
  return {
    title: p.meta_title || p.title,
    description: p.meta_description || p.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: p.meta_title || p.title,
      description: p.meta_description || p.excerpt,
      url,
      images: p.image ? [p.image] : [],
      publishedTime: p.published_at,
      modifiedTime: p.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      images: p.image ? [p.image] : [],
    },
  };
}
export default async function BlogPage({ params }: Props) {
  const { category, slug, locale: raw } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const all = await getBlogs();
  const p = await getBlog(category, slug);
  if (!p) {
    const moved = await getBlogRedirect(`/posts/${category}/${slug}`);
    if (moved)
      permanentRedirect(`${locale === "ar" ? "/ar" : ""}${blogUrl(moved)}`);
    notFound();
  }
  const { content, toc } = blogContent(p.content_html);
  const related = all
    .filter((x) => x.id !== p.id)
    .sort(
      (a, b) =>
        Number(b.category_id === p.category_id) -
        Number(a.category_id === p.category_id),
    )
    .slice(0, 3);
  const url = `${getSiteUrl()}${locale === "ar" ? "/ar" : ""}${blogUrl(p)}`;
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      image: p.image ? [p.image] : undefined,
      datePublished: p.published_at,
      dateModified: p.updated_at,
      author: { "@type": "Person", name: p.author },
      publisher: { "@type": "Organization", name: "Misk Al Ghazaal" },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Blogs",
          item: `${getSiteUrl()}/posts`,
        },
        { "@type": "ListItem", position: 2, name: p.title, item: url },
      ],
    },
  ];
  return (
    <article className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/posts"
        className="text-xs uppercase tracking-widest text-gold"
      >
        ← Blogs
      </Link>
      <header className="mx-auto my-10 max-w-3xl text-center">
        <p className="eyebrow text-gold">{p.blog_categories.name}</p>
        <h1 className="mt-5 text-4xl font-light leading-tight md:text-5xl">
          {p.title}
        </h1>
        <p className="mt-6 text-xs text-fog">
          {p.author} ·{" "}
          {new Date(p.published_at).toLocaleDateString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          ·{" "}
          {Math.max(
            1,
            Math.ceil(
              content.replace(/<[^>]*>/g, " ").split(/\s+/).length / 200,
            ),
          )}{" "}
          min read
        </p>
      </header>
      {p.image && (
        <div className="mb-12">
          {p.mobile_image && (
            <SafeImage
              src={p.mobile_image}
              fallback={p.image}
              alt={p.image_alt || p.title}
              width={900}
              height={1100}
              priority
              className="max-h-[70vh] w-full object-cover md:hidden"
            />
          )}
          <SafeImage
            src={p.image}
            fallback=""
            alt={p.image_alt || p.title}
            width={1600}
            height={800}
            priority
            sizes="100vw"
            className={`max-h-[65vh] w-full object-cover ${p.mobile_image ? "hidden md:block" : ""}`}
          />
        </div>
      )}
      <div className="grid items-start gap-10 lg:grid-cols-[190px_minmax(0,1fr)_220px]">
        {toc.length > 0 ? (
          <nav
            aria-label="Table of contents"
            className="rounded-xl bg-sand/40 p-5 lg:sticky lg:top-24"
          >
            <h2 className="mb-4 text-sm font-medium">Table of contents</h2>
            <ul className="space-y-3">
              {toc.map((t) => (
                <li key={t.id} className={t.level > 2 ? "ps-3" : ""}>
                  <a
                    href={`#${t.id}`}
                    className="text-xs leading-6 text-fog hover:text-gold"
                  >
                    {t.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : (
          <div />
        )}
        <div
          className="blog-prose min-w-0"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <aside className="lg:sticky lg:top-24">
          <h2 className="mb-5 text-sm font-medium">More to discover</h2>
          {related.map((r) => (
            <Link
              className="mb-6 block border-b border-ink/10 pb-5"
              key={r.id}
              href={blogUrl(r)}
            >
              {r.image && (
                <SafeImage
                  src={r.image}
                  fallback=""
                  alt=""
                  width={400}
                  height={250}
                  sizes="220px"
                  className="mb-3 aspect-[8/5] w-full object-cover"
                />
              )}
              <span className="text-sm leading-6">{r.title}</span>
            </Link>
          ))}
        </aside>
      </div>
    </article>
  );
}
