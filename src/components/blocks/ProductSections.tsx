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
  const groups = order
    .map((k) => ({ kind: k, items: product.notes.filter((n) => n.kind === k) }))
    .filter((g) => g.items.length);
  const ribbon = `linear-gradient(90deg, ${product.notes.map((n) => n.color).join(", ")})`;
  const kindLabel = (k: string) =>
    k === "top" ? t("noteTop") : k === "heart" ? t("noteHeart") : t("noteBase");

  return (
    <section className="mt-12 border-t border-ink/10 pt-10" aria-label={t("notesTitle")}>
      <p className="eyebrow text-gold">{t("notesEyebrow")}</p>
      <h2 className="mt-2.5 font-display text-3xl text-ink">{t("notesTitle")}</h2>
      <div className="mt-6 h-1 w-full" style={{ background: ribbon }} aria-hidden />
      <div className="mt-6 grid gap-8 sm:grid-cols-3">
        {groups.map((g) => (
          <div key={g.kind}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fog">
              {kindLabel(g.kind)}
            </p>
            <ul className="mt-3 space-y-2.5">
              {g.items.map((n) => (
                <li key={n.id} className="group flex items-center gap-3">
                  <span
                    aria-hidden
                    className="size-3.5 shrink-0 rounded-full ring-1 ring-ink/15 ring-offset-2 ring-offset-cream transition-transform group-hover:scale-125"
                    style={{ backgroundColor: n.color }}
                  />
                  <span className="font-display text-lg text-ink">
                    {tx(n.name, n.nameAr, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Link
        href="#detailed-notes"
        className="link-underline mt-6 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
      >
        {t("notesExplore")}
      </Link>
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
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: reviews.filter((r) => r.rating === s).length,
  }));
  return (
    <section id="reviews" className="mt-12 scroll-mt-24 border-t border-ink/10 pt-10" aria-label={t("reviewsTitle")}>
      <p className="eyebrow text-gold">{t("reviewsEyebrow")}</p>
      <h2 className="mt-2.5 font-display text-3xl text-ink">{t("reviewsTitle")}</h2>

      {count === 0 ? (
        /* No approved reviews yet: honest empty state, never seeded numbers. */
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <p className="border border-dashed border-ink/20 p-8 text-center font-display text-xl text-ink">
            {t("reviewsEmpty")}
          </p>
          <ReviewForm productId={product.id} productSlug={product.slug} locale={locale} />
        </div>
      ) : (
      <div className="mt-6 grid gap-10 lg:grid-cols-[280px_1fr]">
        <div className="lg:border-e lg:border-ink/10 lg:pe-10">
          <p className="font-display text-6xl text-ink">{avg.toFixed(1)}</p>
          <div className="mt-2">
            <Stars value={avg} />
          </div>
          <p className="mt-2 text-sm text-fog">
            {count} {t("reviews")}
          </p>
          <div className="mt-5 space-y-1.5">
            {dist.map((d) => (
              <div key={d.stars} className="flex items-center gap-2 text-[12px] text-fog">
                <span className="w-3">{d.stars}</span>
                <Star className="size-3 fill-gold/60 text-gold/60" />
                <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink/10">
                  <span
                    className="block h-full bg-gold"
                    style={{ width: `${count ? (d.count / count) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-6 text-end">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {reviews.slice(0, 6).map((r) => (
              <li key={r.id} className="py-6">
                <div className="flex items-center justify-between gap-4">
                  <Stars value={r.rating} className="size-3.5" />
                  <span className="text-[12px] text-fog">{r.authorName}</span>
                </div>
                {r.title && <p className="mt-2 font-medium text-ink">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm leading-relaxed text-espresso">{r.body}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ReviewForm productId={product.id} productSlug={product.slug} locale={locale} />
          </div>
        </div>
      </div>
      )}
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
