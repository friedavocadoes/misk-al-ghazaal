import { BlogCardGrid } from "@/components/blocks/ContentBlocks";
import { articles } from "@/lib/mock-data";

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
        News & events
      </p>
      <h1 className="mt-1 text-3xl font-bold text-stone-900">Latest Blog</h1>
      <div className="mt-6">
        <BlogCardGrid articles={articles} />
      </div>
    </div>
  );
}
