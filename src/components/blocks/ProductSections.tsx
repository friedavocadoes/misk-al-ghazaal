import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BadgeCheck, Star } from "lucide-react";
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
import { NoteTooltip } from "@/components/product/NoteTooltip";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { SafeImage } from "@/components/ui/safe-image";
import { ReviewForm } from "@/components/blocks/ReviewForm";

export function productHeading(product: Product, key: string, locale: Locale, fallback: string) {
  return (locale === "ar" ? product.pdpContent?.[`${key}_ar`] : undefined) || product.pdpContent?.[key] || fallback;
}

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
    <section id="fragrance-notes" className="pdp-section pdp-composition scroll-mt-28" aria-labelledby="fragrance-notes-title">
      <div className="text-center">
        <h2 id="fragrance-notes-title" className="pdp-heading">{productHeading(product, "composition", locale, t("notesTitle"))}</h2>
      </div>
      <div className="mt-10 grid grid-cols-3 divide-x divide-ink/10 rtl:divide-x-reverse">
        {order.map((kind) => {
          const items = product.notes.filter((n) => n.kind === kind);
          return (
            <div key={kind} className="min-w-0 px-2 py-7 text-center sm:px-5 md:py-10">
              <h3 className="mt-3 text-[9px] font-medium uppercase tracking-[0.14em] text-espresso sm:text-[11px] sm:tracking-[0.24em]">{kindLabel(kind)}</h3>
              <ul className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-6 md:gap-x-6">
                {items.map((n) => (
                  <li key={n.id} className="pyramid-note flex w-full flex-col items-center gap-3 sm:w-20 md:w-24">
                    <NoteTooltip note={n} locale={locale} className="composition-note-trigger"><NoteGlyph glyph={n.glyph} className="size-16 sm:size-20 md:size-24" /><span className="text-[10px] leading-snug text-espresso sm:text-[11px]">{tx(n.name, n.nameAr, locale)}</span></NoteTooltip>
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
    tx(product.descriptionHtml, product.descriptionAr, locale).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return (
    <section id="fragrance-story" className="pdp-section pdp-story text-center">
      <h2 className="pdp-heading">{productHeading(product, "story", locale, t("aboutEyebrow"))}</h2>
      <p className="mx-auto mt-7 max-w-2xl whitespace-pre-line text-[15px] font-light leading-[1.95] text-espresso md:text-lg">
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
  const body = tx(ritual.bodyHtml, ritual.bodyAr, locale);
  const isVideoFile = ritual.videoUrl && /\.(mp4|webm|mov)(\?|$)/i.test(ritual.videoUrl);
  return (
    <section className="pdp-section pdp-ritual" aria-label={tx(ritual.title, ritual.titleAr, locale)}>
      <h2 className="pdp-heading text-center">
        {tx(ritual.title, ritual.titleAr, locale)}
      </h2>
      <div className={`mt-10 grid items-center gap-8 lg:gap-14 ${ritual.videoUrl || ritual.image ? "lg:grid-cols-2" : "mx-auto max-w-2xl text-center"}`}>
        {(ritual.videoUrl || ritual.image) && <div className="relative overflow-hidden rounded-sm bg-sand">
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
            <SafeImage src={ritual.image} fallback="" alt={tx(ritual.title, ritual.titleAr, locale)} width={960} height={720} sizes="(min-width:1024px) 560px, 100vw" className="aspect-[4/3] w-full object-cover" />
          ) : null}
        </div>}
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
    <section id="detailed-notes" className="pdp-artwork scroll-mt-24">
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
    <section id="reviews" className="pdp-section pdp-reviews scroll-mt-24" aria-label={t("reviewsTitle")}>
      <div className="review-section-heading">
        <h2 className="pdp-heading">{productHeading(product, "reviews", locale, t("reviewsTitle"))}</h2>
        {product.reviewCount > 0 && <p className="mt-4 text-sm text-fog">{product.rating.toFixed(1)} / 5 · {product.reviewCount} {locale === "ar" ? "تقييمات" : "ratings"}</p>}
      </div>
      <div className={`review-workspace ${count ? "has-reviews" : ""}`}>
      <div className="review-composer"><ReviewForm productId={product.id} productSlug={product.slug} locale={locale} /></div>
      {count > 0 && <ul className="pdp-review-grid">{reviews.map(r => <li key={r.id} className="pdp-review-card">
        <div className="flex items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand text-sm text-espresso">
            {r.authorAvatar ? <SafeImage src={r.authorAvatar} fallback="/logo.webp" alt="" fill sizes="44px" className="object-cover" /> : (r.authorName?.charAt(0) || <span aria-hidden="true">✧</span>)}
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-sm font-medium">{r.authorName || (locale === "ar" ? "عميل" : "Customer")}</h3>
            <time dateTime={r.createdAt} className="mt-1 block text-[11px] text-fog">{new Intl.DateTimeFormat(locale, {month:"short", year:"numeric"}).format(new Date(r.createdAt))}</time>
          </div>
        </div>
        <div className="mt-5" role="img" aria-label={`${r.rating} / 5`}><Stars value={r.rating} className="size-3.5" /></div>
        {r.title && <h4 className="mt-4 text-base font-medium">{r.title}</h4>}
        {r.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-espresso">{r.body}</p>}
        {r.purchasedAt && <p className="mt-6 flex items-center gap-2 border-t border-ink/10 pt-4 text-[10px] text-fog"><BadgeCheck className="size-4 shrink-0 text-gold" /><span>{locale === "ar" ? "شراء موثّق" : "Verified purchase"} · {new Intl.DateTimeFormat(locale, {day:"numeric", month:"short", year:"numeric"}).format(new Date(r.purchasedAt))}</span></p>}
      </li>)}</ul>}
      </div>
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
        title={tx(product.lineupTitle ?? "", product.lineupTitleAr, locale) || t("lineupTitle")}
        products={siblings}
        viewAllHref={product.lineupSlug ? `/collection/all?lineup=${encodeURIComponent(product.lineupSlug)}` : undefined}
      />
    </div>
  );
}
