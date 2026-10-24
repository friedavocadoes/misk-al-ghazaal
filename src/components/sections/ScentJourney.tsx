"use client";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Search, X } from "lucide-react";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { ProductCard } from "@/components/product/ProductCard";
import { Link } from "@/i18n/navigation";
import { tx } from "@/lib/i18n";
import { noteTint, rankScents, type ScentAudience } from "@/lib/scent-matching";
import type { Note, Product } from "@/lib/types";
const Cubes = dynamic(
  () => import("./BackgroundCubesGrid").then((m) => m.BackgroundCubesGrid),
  { ssr: false },
);
const AUDIENCES: ScentAudience[] = ["men", "women", "unisex"];
const AUDIENCE_TINT = { men: "#8099b2", women: "#bd8996", unisex: "#a88b70" };

export function ScentJourney({
  notes,
  products,
}: {
  notes: Note[];
  products: Product[];
}) {
  const locale = useLocale() === "ar" ? "ar" : "en";
  const ar = locale === "ar";
  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState<ScentAudience | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const library = useMemo(() => {
    const map = new Map(notes.map((n) => [n.slug, n]));
    for (const p of products)
      for (const n of p.notes) if (!map.has(n.slug)) map.set(n.slug, n);
    const counts = new Map<string, number>();
    for (const p of products)
      for (const slug of new Set(p.notes.map((n) => n.slug)))
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
    return [...map.values()].sort(
      (a, b) =>
        (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0) ||
        a.name.localeCompare(b.name),
    );
  }, [notes, products]);
  const matches = library.filter((n) =>
    `${n.name} ${n.nameAr ?? ""} ${n.slug}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const visible = query.trim() ? matches : library.slice(0, 12);
  const chosen = library.filter((n) => selected.includes(n.slug));
  const results = useMemo(
    () => (audience ? rankScents(products, audience, selected) : []),
    [products, audience, selected],
  );
  const colors = [
    audience ? AUDIENCE_TINT[audience] : "#d6cbb9",
    ...chosen.map((n) => noteTint(n.name)),
  ];
  const glass = {
    "--scent-a": colors[0] + "55",
    "--scent-b": (colors[1] ?? colors[0]) + "55",
    "--scent-c": (colors[2] ?? "#ded8cf") + "55",
    "--scent-d": (colors[3] ?? "#f0eae1") + "66",
  } as CSSProperties;
  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      document
        .getElementById("scent-stage")
        ?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        });
    });
  }
  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 3
          ? [...prev, slug]
          : prev,
    );
  }
  const audienceLabel = (value: ScentAudience) =>
    ({
      men: ar ? "للرجال" : "For him",
      women: ar ? "للنساء" : "For her",
      unisex: ar ? "للجميع" : "Unisex",
    })[value];
  return (
    <div className="scent-journey" data-results={step === 2} style={glass}>
      <div className="scent-background-track" aria-hidden="true">
        <div className="scent-background">
          {step < 2 && (
            <div className="scent-cube-field">
              <Cubes
                cellSize={110}
                topColor="#e8e4dd"
                leftColor="#d7d1c6"
                rightColor="#c8c0b4"
                glowColor="#b7a18b"
                glow={0.35}
                amplitude={0.45}
              />
              <div className="scent-cube-fade" />
            </div>
          )}
          {step === 2 && <div className="scent-spotlight" aria-hidden="true" />}
        </div>
      </div>
      <header className="scent-intro">
        <p className="eyebrow">{ar ? "كيمياء العطر" : "The scent alchemist"}</p>
        <h1>
          {ar ? "عطر يشبهك." : "A little instinct."}
          <br />
          <span>{ar ? "اختيارك، إحساسك." : "A scent that’s yours."}</span>
        </h1>
        <p>
          {ar
            ? "اتبع إحساسك. دع النوتات تقودك."
            : "Follow your senses. Let the notes lead."}
        </p>
      </header>
      <section
        id="scent-stage"
        className={`scent-stage ${step === 2 ? "scent-stage-results" : ""}`}
        aria-labelledby="scent-step-heading"
      >
        <div
          className="scent-steps"
          aria-label={ar ? "خطوات اكتشاف العطر" : "Your scent journey"}
        >
          {[
            ar ? "أنت" : "You",
            ar ? "النوتات" : "The notes",
            ar ? "عطرك" : "Your scents",
          ].map((label, i) => (
            <span
              key={i}
              aria-current={step === i ? "step" : undefined}
              data-current={step === i}
              data-complete={step > i}
            >
              <i>{step > i ? <Check className="size-3" /> : `0${i + 1}`}</i>
              {label}
            </span>
          ))}
        </div>
        <div className="scent-glass">
          <div className="scent-step-content" key={step}>
            <div className="scent-step-title">
              <p className="eyebrow">
                {ar ? "اكتشاف شخصي" : "A personal discovery"}
              </p>
              <h2 ref={heading} tabIndex={-1} id="scent-step-heading">
                {step === 0
                  ? ar
                    ? "لمن تختار العطر؟"
                    : "Who is this scent for?"
                  : step === 1
                    ? ar
                      ? "ما الذي يجذبك؟"
                      : "What draws you in?"
                    : ar
                      ? "تعرف على عطرك القادم."
                      : "Meet your next signature."}
              </h2>
              <p>
                {step === 0
                  ? ar
                    ? "ابدأ بما يناسبك."
                    : "Start with the way you wear it."
                  : step === 1
                    ? ar
                      ? "اختر من نوتة إلى ثلاث نوتات."
                      : "Choose one to three notes. Trust your instinct."
                    : ar
                      ? "اختيارات من مجموعتنا، مستوحاة من ذوقك."
                      : "From our collection, guided by your choices."}
              </p>
            </div>
            {step === 0 && (
              <div
                className="scent-audiences"
                role="group"
                aria-label={ar ? "لمن العطر" : "Who is the fragrance for"}
              >
                {AUDIENCES.map((value, i) => (
                  <button
                    type="button"
                    key={value}
                    className="scent-audience"
                    aria-pressed={audience === value}
                    onClick={() => setAudience(value)}
                    style={
                      {
                        "--audience-color": AUDIENCE_TINT[value],
                      } as CSSProperties
                    }
                  >
                    <span
                      className={`scent-orbit scent-orbit-${i}`}
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>{audienceLabel(value)}</span>
                    <small>
                      {
                        [
                          ar ? "حضور مميز" : "Quiet presence",
                          ar ? "تعبير خاص" : "Individual expression",
                          ar ? "بلا حدود" : "Without boundaries",
                        ][i]
                      }
                    </small>
                    <span className="scent-choice-mark" aria-hidden="true">
                      {audience === value && <Check className="size-3" />}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {step === 1 && (
              <>
                <div className="scent-search">
                  <Search className="size-4" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      ar
                        ? "ابحث في جميع النوتات"
                        : "Search the entire note library"
                    }
                    aria-label={ar ? "البحث عن النوتات" : "Search notes"}
                  />
                  <span aria-live="polite" dir="ltr">
                    {selected.length} / 3
                  </span>
                </div>
                <div
                  className="scent-selected"
                  aria-label={ar ? "النوتات المختارة" : "Selected notes"}
                >
                  {chosen.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => toggle(n.slug)}
                    >
                      <NoteGlyph glyph={n.glyph} className="size-5" />
                      {tx(n.name, n.nameAr, locale)}
                      <X className="size-3" />
                      <span className="sr-only">{ar ? "إزالة" : "Remove"}</span>
                    </button>
                  ))}
                </div>
                <div
                  className="scent-note-grid"
                  aria-label={ar ? "النوتات" : "Notes"}
                >
                  {visible.map((n) => (
                    <button
                      type="button"
                      key={n.slug}
                      onClick={() => toggle(n.slug)}
                      aria-pressed={selected.includes(n.slug)}
                      disabled={
                        selected.length === 3 && !selected.includes(n.slug)
                      }
                    >
                      <NoteGlyph glyph={n.glyph} className="scent-note-glyph" />
                      <span>{tx(n.name, n.nameAr, locale)}</span>
                      {selected.includes(n.slug) && (
                        <Check className="scent-note-check size-3" />
                      )}
                    </button>
                  ))}
                </div>
                {!visible.length && (
                  <p role="status" className="py-10 text-center text-sm">
                    {ar
                      ? "لم نجد هذه النوتة. جرّب اسماً آخر."
                      : "No note found. Try another name."}
                  </p>
                )}
                {query.trim() && (
                  <p role="status" className="mt-3 text-xs text-fog">
                    {matches.length} {ar ? "نوتات" : "notes found"}
                  </p>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <div className="scent-result-summary">
                  <span>{audience && audienceLabel(audience)}</span>
                  {chosen.map((n) => (
                    <span key={n.id}>
                      <NoteGlyph glyph={n.glyph} className="size-5" />
                      {tx(n.name, n.nameAr, locale)}
                    </span>
                  ))}
                </div>
                <div className="scent-results-grid">
                  {results.map(({ product, hits, audienceMatch }, i) => (
                    <article
                      key={product.id}
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <p className="scent-match-label">
                        {hits.length
                          ? ar
                            ? `${hits.length} من ${selected.length} نوتات`
                            : `${hits.length} of ${selected.length} notes`
                          : ar
                            ? "اختيار للاستكشاف"
                            : "Something to explore"}
                        {!audienceMatch && hits.length > 0 && (
                          <span>
                            {ar
                              ? "خارج تفضيلك الأول"
                              : "Beyond your first preference"}
                          </span>
                        )}
                      </p>
                      <ProductCard product={product} />
                    </article>
                  ))}
                </div>
                {!results.length && (
                  <p className="py-16 text-center">
                    {ar
                      ? "العطور الجديدة في الطريق."
                      : "New discoveries are on their way."}{" "}
                    <Link href="/collection/all" className="underline">
                      {ar ? "عرض المجموعة" : "Explore the collection"}
                    </Link>
                  </p>
                )}
              </>
            )}
            <div className="scent-step-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="scent-back"
                  onClick={() => move(step - 1)}
                >
                  <ArrowLeft className="size-4 rtl:rotate-180" />
                  {ar ? "رجوع" : "Back"}
                </button>
              ) : (
                <span className="scent-footnote">
                  {ar
                    ? "اختيارات قليلة. احتمالات جميلة."
                    : "A few choices. Beautiful possibilities."}
                </span>
              )}
              {step < 2 ? (
                <button
                  type="button"
                  className="scent-next"
                  disabled={step === 0 ? !audience : !selected.length}
                  onClick={() => move(step + 1)}
                >
                  {step === 0
                    ? ar
                      ? "اختر النوتات"
                      : "Choose your notes"
                    : ar
                      ? "اكتشف عطري"
                      : "Reveal my scents"}
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </button>
              ) : (
                <button
                  type="button"
                  className="scent-back"
                  onClick={() => {
                    setAudience(null);
                    setSelected([]);
                    setQuery("");
                    move(0);
                  }}
                >
                  {ar ? "ابدأ من جديد" : "Begin again"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
