import { notFound } from "next/navigation";
import Link from "next/link";
import { BlogCardGrid } from "@/components/blocks/ContentBlocks";
import { articles } from "@/lib/mock-data";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage(
  props: PageProps<"/blog/[slug]">
) {
  const { slug } = await props.params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/blog" className="text-sm font-semibold text-emerald-900">
        ← All articles
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-stone-900">{article.title}</h1>
      <p className="mt-2 text-sm text-stone-500">
        {article.date} · {article.author}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={article.image}
        alt={article.title}
        className="mt-6 aspect-[16/9] w-full rounded-3xl object-cover"
      />
      <div
        className="prose mt-6 max-w-none text-stone-700"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />
      <h2 className="mb-4 mt-12 text-xl font-bold">Keep reading</h2>
      <BlogCardGrid
        articles={articles.filter((a) => a.slug !== article.slug)}
      />
    </article>
  );
}
