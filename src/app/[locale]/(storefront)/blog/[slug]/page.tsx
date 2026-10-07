import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BlogCardGrid } from "@/components/blocks/ContentBlocks";
import { getArticleBySlug, getArticles } from "@/lib/store";
import { toLocale } from "@/lib/i18n";
import { tx } from "@/lib/i18n";

export async function generateStaticParams() {
  const all = await getArticles();
  return all.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage(
  props: PageProps<"/[locale]/blog/[slug]">
) {
  const { slug, locale: rawLocale } = await props.params;
  const locale = toLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Blog" });
  const article = await getArticleBySlug(slug);
  if (!article) notFound();
  const rest = (await getArticles()).filter((a) => a.slug !== article.slug);

  return (
    <article className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <Link
        href="/blog"
        className="link-underline text-[11px] font-semibold uppercase tracking-[0.2em] text-gold"
      >
        ← {t("back")}
      </Link>
      <p className="eyebrow mt-6 text-fog">
        {article.date} · {article.author}
      </p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
        {tx(article.title, article.titleAr, locale)}
      </h1>
      <span className="relative mt-6 block aspect-[16/9] overflow-hidden bg-sand">
        <Image
          src={article.image}
          alt={tx(article.title, article.titleAr, locale)}
          fill
          sizes="(min-width:768px) 768px, 100vw"
          className="object-cover"
        />
      </span>
      <div
        className="prose mt-8 max-w-none text-espresso"
        dangerouslySetInnerHTML={{
          __html: tx(article.contentHtml, article.contentAr, locale),
        }}
      />
      <h2 className="mb-6 mt-16 font-display text-2xl text-ink">{t("keepReading")}</h2>
      <BlogCardGrid articles={rest} />
    </article>
  );
}
