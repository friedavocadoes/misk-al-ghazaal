import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { BlogCardGrid } from "@/components/blocks/ContentBlocks";
import { getArticles } from "@/lib/store";

export default async function BlogPage(props: PageProps<"/[locale]/blog">) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Blog" });
  const articles = await getArticles();
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-2.5 font-display text-4xl text-ink md:text-5xl">
        {t("title")}
      </h1>
      <div className="mt-10">
        <BlogCardGrid articles={articles} />
      </div>
    </div>
  );
}
