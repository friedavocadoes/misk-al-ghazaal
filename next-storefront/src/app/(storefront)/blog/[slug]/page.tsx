import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BlogCardGrid } from "@/components/blocks/ContentBlocks";
import { getArticleBySlug, getArticles } from "@/lib/store";

export async function generateStaticParams() {
  const all = await getArticles();
  return all.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage(
  props: PageProps<"/blog/[slug]">
) {
  const { slug } = await props.params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();
  const rest = (await getArticles()).filter((a) => a.slug !== article.slug);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <Link
        href="/blog"
        className="link-underline text-[11px] font-semibold uppercase tracking-[0.2em] text-gold"
      >
        ← Journal
      </Link>
      <p className="eyebrow mt-6 text-fog">
        {article.date} · {article.author}
      </p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
        {article.title}
      </h1>
      <span className="relative mt-6 block aspect-[16/9] overflow-hidden bg-sand">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(min-width:768px) 768px, 100vw"
          className="object-cover"
        />
      </span>
      <div
        className="prose mt-8 max-w-none text-espresso"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />
      <h2 className="mb-6 mt-16 font-display text-2xl text-ink">Keep Reading</h2>
      <BlogCardGrid articles={rest} />
    </article>
  );
}
