import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { ProductCarousel } from "@/components/blocks/ProductCarousel";
import {
  getApprovedReviews,
  getLineupSiblings,
  getRitualById,
} from "@/lib/store";
import { L } from "@/lib/site";
import { pick, tx } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { Product, Review } from "@/lib/types";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { ReviewForm } from "@/components/blocks/ReviewForm";

function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${className} ${i < Math.round(value) ? "fill-gold text-gold" : "text-ink/20"}`}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 1. Notes brief: gradient ribbon of the pyramid + color dots with names.
// ---------------------------------------------------------------------------
export async function NotesBrief({ product, locale }: { product: Product; locale: Locale }) {
  if (!product.notes.length) return null;
  const t = await getTranslations({ locale, namespace: "Product" });
  const order = ["top", "heart", "base"] as const;
  const kindLabel = (k: string) => k === "top" ? t("noteTop") : k === "heart" ? t("noteHeart") : t("noteBase");
  return (
    <section id="fragrance-notes" className="mt-14 scroll-mt-28 border-t border-ink/15 pt-10 md:mt-20" aria-labelledby="fragrance-notes-title">
      <div className="text-center">
        <p className="eyebrow text-gold">{t("notesEyebrow")}</p>
        <h2 id="fragrance-notes-title" className="mt-3 font-display text-3xl text-ink md:text-4xl">{t("notesTitle")}</h2>
      </div>
      <div className="mt-9 grid grid-cols-3 divide-x divide-ink/15 border-y border-ink/15 rtl:divide-x-reverse">
        {order.map((kind, index) => {
          const items = product.notes.filter((n) => n.kind === kind);
          return (
            <div key={kind} className="min-w-0 px-2 py-7 text-center sm:px-5 md:py-10">
              <span aria-hidden="true" className="font-display text-xs italic text-gold">0{index + 1}</span>
              <h3 className="mt-3 text-[9px] font-medium uppercase tracking-[0.14em] text-espresso sm:text-[11px] sm:tracking-[0.24em]">{kindLabel(kind)}</h3>
              <ul className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-6 md:gap-x-6">
                {items.map((n) => (
                  <li key={n.id} className="pyramid-note flex w-full flex-col items-center gap-3 sm:w-20 md:w-24">
                    <NoteGlyph glyph={n.glyph} className="size-16 sm:size-20 md:size-24" />
                    <span className="text-[10px] leading-snug text-espresso sm:text-[11px]">{tx(n.name, n.nameAr, locale)}</span>
                  </li>
                ))}
                {!items.length && <li className="py-8 text-xs text-fog" aria-label={locale === "ar" ? "غير محدد" : "Not specified"}>—</li>}
              </ul>
            </div>
          );
        })}
      </div>
      {(product.notesImageDesktop || product.notesImageMobile) && <div className="mt-6 text-center"><Link href="#detailed-notes" className="link-underline text-[10px] font-medium uppercase tracking-[0.16em] text-espresso">{t("notesExplore")}</Link></div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 7. About: short editorial blurb.
// ---------------------------------------------------------------------------
export async function AboutShort({ product, locale }: { product: Product; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Product" });
  const text =
    tx(product.shortDesc ?? "", product.shortDescAr, locale) ||
    product.descriptionHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
  if (!text) return null;
  return (
    <section className="mt-12 border-t border-ink/10 pt-10">
      <p className="eyebrow text-gold">{t("aboutEyebrow")}</p>
      <p className="mt-4 max-w-3xl font-display text-2xl leading-snug text-ink md:text-[1.75rem]">
        {text}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. Ritual: reusable how-to-use guide (image or video + rich body).
// ---------------------------------------------------------------------------
export async function RitualSection({ product, locale }: { product: Product; locale: Locale }) {
  if (!product.ritualId) return null;
  const ritual = await getRitualById(product.ritualId);
  if (!ritual) return null;
  const t = await getTranslations({ locale, namespace: "Product" });
  const body = tx(ritual.bodyHtml, ritual.bodyAr, locale);
  const isVideoFile = ritual.videoUrl && /\.(mp4|webm|mov)(\?|$)/i.test(ritual.videoUrl);
  return (
    <section className="mt-12 border-t border-ink/10 pt-10" aria-label={tx(ritual.title, ritual.titleAr, locale)}>
      <p className="eyebrow text-gold">{t("ritualEyebrow")}</p>
      <h2 className="mt-2.5 font-display text-3xl text-ink">
        {tx(ritual.title, ritual.titleAr, locale)}
      </h2>
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <div className="relative overflow-hidden border border-ink/10 bg-sand">
          {ritual.videoUrl && !isVideoFile ? (
            <iframe
              title={tx(ritual.title, ritual.titleAr, locale)}
              src={ritual.videoUrl}
              loading="lazy"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full border-0"
            />
          ) : ritual.videoUrl ? (
            <video src={ritual.videoUrl} controls playsInline preload="metadata" className="aspect-video w-full object-cover" />
          ) : ritual.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ritual.image} alt={tx(ritual.title, ritual.titleAr, locale)} className="aspect-[4/3] w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div
          className="prose max-w-none text-[15px] leading-relaxed text-espresso"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 8. Detailed notes artwork (responsive pair).
// ---------------------------------------------------------------------------
export function DetailedNotes({ product, locale }: { product: Product; locale: Locale }) {
  if (!product.notesImageDesktop && !product.notesImageMobile) return null;
  const alt = pick(L("Fragrance notes", "النوتات العطرية"), locale);
  return (
    <section id="detailed-notes" className="mt-12 scroll-mt-24 border-t border-ink/10 pt-10">
      {product.notesImageDesktop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.notesImageDesktop}
          alt={alt}
          loading="lazy"
          className={`w-full border border-ink/10 object-cover ${product.notesImageMobile ? "hidden md:block" : ""}`}
        />
      )}
      {product.notesImageMobile && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.notesImageMobile}
          alt={alt}
          loading="lazy"
          className={`w-full border border-ink/10 object-cover ${product.notesImageDesktop ? "md:hidden" : ""}`}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3 + 10. Reviews (summary + list + form) and lineup siblings.
// ---------------------------------------------------------------------------
export async function ReviewsSection({
  product,
  locale,
  reviews: provided,
}: {
  product: Product;
  locale: Locale;
  reviews?: Review[];
}) {
  const t = await getTranslations({ locale, namespace: "Product" });
  const reviews = provided ?? (await getApprovedReviews(product.id, 200));
  const count = reviews.length;
  return (
    <section id="reviews" className="mt-12 scroll-mt-24 border-t border-ink/10 pt-10" aria-label={t("reviewsTitle")}>
      <p className="eyebrow text-gold">{t("reviewsEyebrow")}</p>
      <h2 className="mt-2.5 font-display text-3xl text-ink">{t("reviewsTitle")}</h2>

      <div className="mt-8"><ReviewForm productId={product.id} productSlug={product.slug} locale={locale} /></div>
      {product.reviewCount > 0 && <p className="mt-8 text-center text-sm text-fog">{product.rating.toFixed(1)} / 5 · {product.reviewCount} {locale === "ar" ? "تقييمات" : "ratings"}</p>}
      {count > 0 && <ul className="review-gallery mt-10">{reviews.map(r => <li key={r.id}><div className="flex items-center justify-between gap-3"><Stars value={r.rating} /><span className="text-xs text-fog">{r.authorName}</span></div>{r.title && <h3 className="mt-5 text-lg">{r.title}</h3>}<p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-espresso">{r.body}</p></li>)}</ul>}
    </section>
  );
}

export async function LineupRow({ product, locale }: { product: Product; locale: Locale }) {
  if (!product.lineupId) return null;
  const siblings = await getLineupSiblings(product, 8);
  if (!siblings.length) return null;
  const t = await getTranslations({ locale, namespace: "Product" });
  return (
    <div className="mt-4">
      <ProductCarousel
        eyebrow={t("lineupEyebrow")}
        title={tx(product.lineupTitle ?? "", product.lineupTitleAr, locale) || t("lineupTitle")}
        products={siblings}
        viewAllHref={`/collection/${product.categorySlugs[0] ?? "best-sellers"}`}
      />
    </div>
  );
}
