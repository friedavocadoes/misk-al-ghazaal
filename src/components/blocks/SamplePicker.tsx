"use client";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ArrowUpRight, Check, Plus, Sparkles, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
import { NoteTooltip } from "@/components/product/NoteTooltip";
import type { Note } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";
import {
  sampleAllowance,
  readSamples,
  type SampleTier,
} from "@/lib/sample-tiers";
type Sample = {
  id: string;
  name: string;
  description: string;
  notes: string;
  noteDetails?: Note[];
  image: string;
  stock: number;
  category_id: string;
};
export function SamplePicker({
  subtotal,
  product = false,
}: {
  subtotal: number;
  product?: boolean;
}) {
  const locale = useLocale() === "ar" ? "ar" : "en";
  const reduced = useReducedMotion();
  const [data, setData] = useState<{
    samples: Sample[];
    tiers: SampleTier[];
    categories: { id: string; name: string }[];
  } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  useEffect(() => {
    queueMicrotask(() => setSelected(readSamples()));
    fetch("/api/samples", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
    const update = () => setSelected(readSamples());
    window.addEventListener("samples-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("samples-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  if (!data?.tiers.length) return null;
  const { count, next, remaining } = sampleAllowance(data.tiers, subtotal);
  const progress = next
    ? Math.min(100, (subtotal / next.min_subtotal) * 100)
    : 100;
  function toggle(id: string) {
    const nextIds = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : selected.length < count
        ? [...selected, id]
        : selected;
    setSelected(nextIds);
    try {
      localStorage.setItem("misk-samples", JSON.stringify(nextIds));
      window.dispatchEvent(new Event("samples-change"));
    } catch {}
  }
  const incentive = next
    ? `Add AED ${remaining.toFixed(2)} ${product ? "to your order " : ""}to unlock ${next.allowance - count} more complimentary ${next.allowance - count === 1 ? "sample" : "samples"}.`
    : "You’ve unlocked our full sample allowance.";
  const chosen = selected
    .map((id) => data.samples.find((s) => s.id === id))
    .filter((s): s is Sample => !!s);
  const visible = data.samples.filter(
    (s) => !category || s.category_id === category,
  );
  function clear() {
    setSelected([]);
    try {
      localStorage.removeItem("misk-samples");
      window.dispatchEvent(new Event("samples-change"));
    } catch {}
  }
  return (
    <>
      <div className="sample-invitation">
        <button data-ios-haptic="on"
          type="button"
          onClick={() => setOpen(true)}
          className="sample-invitation-trigger"
          aria-haspopup="dialog"
        >
          <span className="sample-seal">
            <Sparkles size={21} strokeWidth={1} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="sample-kicker">
              The discovery collection · complimentary
            </span>
            <strong>
              {selected.length
                ? `${selected.length} ${selected.length === 1 ? "discovery" : "discoveries"} selected`
                : count
                  ? `Make room for ${count} new ${count === 1 ? "scent" : "scents"}`
                  : "Your next favourite, a little closer"}
            </strong>
            <span className="sample-invitation-caption">
              {selected.length
                ? "View or edit your samples"
                : count
                  ? `Choose your ${count === 1 ? "sample" : "samples"} with this ${product ? "product" : "order"}`
                  : "Explore the complimentary samples"}
            </span>
          </span>
          <ArrowUpRight size={20} strokeWidth={1.3} />
        </button>
        {selected.length > 0 && (
          <div className="sample-selection-preview" aria-live="polite">
            {chosen.map((s) => (
              <button data-ios-haptic="on"
                key={s.id}
                type="button"
                onClick={() => setOpen(true)}
                className="sample-mini"
              >
                {s.image && (
                  <SafeImage
                    src={s.image}
                    fallback=""
                    alt=""
                    width={32}
                    height={36}
                    className="h-9 w-8 object-contain"
                  />
                )}
                <span>{s.name}</span>
                <Check size={12} />
              </button>
            ))}
            {chosen.length < selected.length && (
              <button data-ios-haptic="on"
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs underline"
              >
                Review unavailable selections
              </button>
            )}
          </div>
        )}
        <div className="sample-invitation-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="sample-incentive">
          {selected.length > count
            ? `Your allowance is now ${count}. Update your selections before checkout.`
            : incentive}
        </p>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sample-drawer sm:max-w-xl">
          <SheetHeader className="sample-drawer-heading">
            <span className="sample-kicker">The discovery collection</span>
            <SheetTitle className="mt-3 text-[32px] font-light leading-tight tracking-tight">
              A little curiosity. A new favourite.
            </SheetTitle>
            <SheetDescription className="mt-3 block max-w-sm text-xs leading-5 text-espresso">
              Choose {count} complimentary {count === 1 ? "sample" : "samples"}.{" "}
              {incentive}
            </SheetDescription>
            <div className="sample-allowance">
              <span>
                {selected.length} / {count} selected
              </span>
              <span>
                {count > selected.length
                  ? `${count - selected.length} to discover`
                  : selected.length > count
                    ? "Update your selection"
                    : "Your selection is ready"}
              </span>
            </div>
            <div className="sample-slot-track" aria-hidden="true">
              <span
                style={{
                  width: `${count ? Math.min(100, (selected.length / count) * 100) : 0}%`,
                }}
              />
            </div>
          </SheetHeader>
          <div className="sample-categories" aria-label="Sample categories">
            {[{ id: "", name: "All scents" }, ...data.categories].map((c) => (
              <button data-ios-haptic="on"
                type="button"
                key={c.id}
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
            {selected.length > count && (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-800"
              >
                Remove {selected.length - count}{" "}
                {selected.length - count === 1 ? "sample" : "samples"} to match
                your current allowance.
              </p>
            )}
            {chosen.length < selected.length && (
              <p className="mb-4 text-xs text-red-800">
                Some selections are no longer available. Clear your selection to
                choose again.
              </p>
            )}
            <div className="sample-discovery-grid">
              {visible.map((s) => {
                const picked = selected.includes(s.id);
                return (
                  <motion.article
                    key={s.id}
                    layout={!reduced}
                    transition={{ duration: reduced ? 0 : 0.3 }}
                    className="sample-discovery-card"
                    data-selected={picked}
                  >
                    <div className="sample-artwork">
                      <span className="sample-artwork-halo" />
                      {s.image ? (
                        <SafeImage
                          src={s.image}
                          fallback=""
                          alt={s.name}
                          width={200}
                          height={200}
                          sizes="(max-width: 480px) 42vw, 240px"
                          className="relative h-full w-full object-contain "
                        />
                      ) : (
                        <Sparkles
                          className="relative size-12 text-gold"
                          strokeWidth={0.75}
                        />
                      )}
                      {picked && (
                        <span className="sample-picked">
                          <Check size={14} />
                          <span className="sr-only">Selected</span>
                        </span>
                      )}
                      {/* <span className="sample-artwork-label">Complimentary</span> */}
                    </div>
                    <div className="sample-card-copy">
                      <h3>{s.name}</h3>
                      {s.description && <p>{s.description}</p>}
                      <div className="sample-note-list">
                        {s.noteDetails?.map((n) => (
                          <NoteTooltip
                            key={n.id}
                            note={n}
                            locale={locale}
                            className="sample-note"
                          >
                            <i style={{ backgroundColor: n.color }} />
                            {locale === "ar" ? n.nameAr || n.name : n.name}
                          </NoteTooltip>
                        ))}
                      </div>
                      <button data-ios-haptic="on"
                        type="button"
                        aria-pressed={picked}
                        disabled={
                          !picked && (s.stock < 1 || selected.length >= count)
                        }
                        onClick={() => toggle(s.id)}
                        className="sample-add"
                      >
                        <span>
                          {picked
                            ? "Selected"
                            : s.stock < 1
                              ? "Unavailable"
                              : selected.length >= count
                                ? count
                                  ? "Selection full"
                                  : "Unlock with your bag"
                                : "Choose sample"}
                        </span>
                        {picked ? <X size={14} /> : <Plus size={14} />}
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
            {!visible.length && (
              <p className="py-12 text-center text-sm text-fog">
                New discoveries are on their way.
              </p>
            )}
            <p className="mt-6 text-[10px] leading-5 text-fog">
              Your final bag determines your allowance, before discounts and
              shipping. Samples are subject to availability.
            </p>
          </div>
          <div className="sample-drawer-footer">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs" role="status">
                {selected.length
                  ? `${selected.length} ${selected.length === 1 ? "sample" : "samples"} saved to your selection`
                  : "A small introduction. A lasting impression."}
              </p>
              {selected.length > 0 && (
                <button data-ios-haptic="on"
                  type="button"
                  onClick={clear}
                  className="shrink-0 text-xs underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <button data-ios-haptic="on"
              type="button"
              className="sample-done"
              onClick={() => setOpen(false)}
            >
              {selected.length ? "Keep my selection" : "Continue exploring"}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
