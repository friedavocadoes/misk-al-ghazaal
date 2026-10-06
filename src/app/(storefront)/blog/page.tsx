import { BlogCardGrid } from "@/components/blocks/ContentBlocks";
import { getArticles } from "@/lib/store";

export default async function BlogPage() {
  const articles = await getArticles();
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <p className="eyebrow text-gold">Journal</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        Notes on Scent
      </h1>
      <div className="mt-10">
        <BlogCardGrid articles={articles} />
      </div>
    </div>
  );
}
