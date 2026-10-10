"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { ImageUploader } from "./image-uploader";
import { toast } from "./admin-form";

/** Top-of-page creation: full banner form + direct artboard upload in a
    modal (no more bottom-of-page URL pasting). */
export function BannerCreateButton({
  create,
}: {
  create: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState("");
  const [fallback, setFallback] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !src) return;
    setBusy(true);
    try {
      await create(new FormData(e.currentTarget));
      toast("Banner live — homepage updates on refresh", "ok");
      setOpen(false);
      setSrc("");
      setFallback("");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Create failed", "bad");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1 w-full border border-ink/20 bg-white px-3 py-2";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 cursor-pointer items-center gap-2 bg-ink px-5 py-2.5 text-sm text-white transition hover:bg-ink/85"
      >
        <Plus className="size-4" /> New banner
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New banner"
          onClick={() => !busy && setOpen(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90svh] w-full max-w-2xl overflow-y-auto border border-ink/10 bg-cream p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Banners</p>
                <h2 className="font-display text-3xl">New banner</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer p-1 text-fog transition hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-4 text-sm md:grid-cols-2">
              <label className="block">
                Slot
                <select name="slot" className={field} defaultValue="hero">
                  <option value="hero">hero (homepage slider)</option>
                  <option value="brand">brand (shop-by-brand)</option>
                </select>
              </label>
              <label className="block">
                Order
                <input name="sort" type="number" defaultValue={0} className={field} />
              </label>

              <div className="md:col-span-2">
                <p className="mb-1 text-sm font-medium">Artwork *</p>
                {src ? (
                  <img src={src} alt="" className="aspect-[16/9] w-full border border-ink/10 bg-sand object-cover" />
                ) : (
                  <div className="flex h-36 items-center justify-center border border-dashed border-ink/25 bg-white text-xs text-ink/50">
                    Upload the banner art below
                  </div>
                )}
                <div className="mt-2">
                  <ImageUploader bucket="banners" prefix="banner" onUploaded={setSrc} />
                </div>
                <input type="hidden" name="src" value={src} />
              </div>

              <div className="md:col-span-2">
                <p className="mb-1 text-sm font-medium">Fallback art (shown if artwork 404s)</p>
                {fallback && (
                  <img src={fallback} alt="" className="mb-2 aspect-[16/9] w-full border border-ink/10 bg-sand object-cover" />
                )}
                <ImageUploader bucket="banners" prefix="banner-fallback" onUploaded={setFallback} />
                <input type="hidden" name="fallback" value={fallback} />
              </div>

              <label className="block">Title (EN)<input name="title" placeholder="Misk Al Ghazaal" className={field} /></label>
              <label className="block">Title (AR)<input name="title_ar" className={field} /></label>
              <label className="block">Eyebrow (EN)<input name="eyebrow" className={field} /></label>
              <label className="block">Eyebrow (AR)<input name="eyebrow_ar" className={field} /></label>
              <label className="block md:col-span-2">Description (EN)<textarea name="desc" rows={2} className={field} /></label>
              <label className="block md:col-span-2">Description (AR)<textarea name="desc_ar" rows={2} className={field} /></label>
              <label className="block">Button (EN)<input name="cta" className={field} /></label>
              <label className="block">Button (AR)<input name="cta_ar" className={field} /></label>
              <label className="block">Link<input name="href" placeholder="/collection/…" dir="ltr" className={field} /></label>
              <label className="block">Alt text<input name="alt" className={field} /></label>

              <button
                type="submit"
                disabled={busy || !src}
                className="flex cursor-pointer items-center justify-center gap-2 bg-ink px-4 py-2.5 text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Publishing…" : "Publish banner"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
