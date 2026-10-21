"use client";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  const [data, setData] = useState<{
    samples: Sample[];
    tiers: SampleTier[];
    categories: { id: string; name: string }[];
  } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  useEffect(() => {
    queueMicrotask(()=>setSelected(readSamples()));
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
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="my-5 w-full rounded-xl border border-gold/30 bg-linear-to-br from-[#eee2c8] to-[#fffdf7] hover:from-[#fffdf7] hover:to-[#eee2c8] p-5 text-start shadow-sm transition duration-400 ease-out hover:shadow-md cursor-pointer"
      >
        <span className="text-[10px] uppercase tracking-[.2em] text-gold">
          A little more to discover
        </span>
        <strong className="my-2 block text-lg font-medium">
          {count
            ? `Choose ${count} complimentary ${count === 1 ? "sample" : "samples"}`
            : "Discover your complimentary samples"}{" "}
          <span aria-hidden>↗</span>
        </strong>
        <span className="block text-xs leading-5 text-espresso">
          {count ? `With this ${product ? "product" : "order"}. ` : ""}
          {incentive}
        </span>
        <span className="mt-3 block h-1 overflow-hidden rounded bg-white">
          <span
            className="block h-full bg-gold"
            style={{ width: `${progress}%` }}
          />
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="bg-[#fffdf8]">
          <SheetHeader className="bg-gradient-to-br from-[#eee2c8]/60 to-[#fffdf8]">
            <SheetTitle>Your next discovery</SheetTitle>
            <SheetDescription>
              {selected.length} selected · {count} available. {incentive}{" "}
              Samples are complimentary with a qualifying order, subject to
              stock.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            <p className="mb-4 text-xs text-fog">
              Eligibility uses merchandise value before discounts and shipping.
              Your final bag determines the allowance.
            </p>
            {selected.length > count && (
              <p role="alert" className="mb-4 text-sm text-red-700">
                Your allowance changed. Remove {selected.length - count}{" "}
                sample(s) before checkout.
              </p>
            )}
            {selected.length > 0 && (
              <button
                type="button"
                className="mb-4 text-sm underline"
                onClick={() => {
                  setSelected([]);
                  localStorage.removeItem("misk-samples");
                  window.dispatchEvent(new Event("samples-change"));
                }}
              >
                Clear selections
              </button>
            )}
            <select
              aria-label="Sample category"
              className="mb-5 w-full border p-3"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All discoveries</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="space-y-4">
              {data.samples
                .filter((s) => !category || s.category_id === category)
                .map((s) => (
                  <article
                    key={s.id}
                    className="rounded-xl border border-ink/10 p-4"
                  >
                    <div className="flex gap-4">
                      {s.image && (
                        <SafeImage
                          src={s.image}
                          fallback=""
                          alt={s.name}
                          width={96}
                          height={112}
                          className="h-28 w-24 object-contain"
                        />
                      )}
                      <div>
                        <h3 className="font-medium">{s.name}</h3>
                        <p className="my-2 text-xs leading-5 text-fog">
                          {s.description}
                        </p>
                        <p className="text-xs text-gold">{s.notes}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={
                        !selected.includes(s.id) &&
                        (s.stock < 1 || selected.length >= count)
                      }
                      onClick={() => toggle(s.id)}
                      className="mt-3 w-full rounded border border-ink/20 py-2 text-sm disabled:opacity-40"
                    >
                      {selected.includes(s.id)
                        ? "Remove selection"
                        : s.stock < 1
                          ? "Currently unavailable"
                          : "Add complimentary sample"}
                    </button>
                  </article>
                ))}
            </div>
            {!data.samples.length && <p>New discoveries are on their way.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
