"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { HeroVideoUploader } from "./hero-video-uploader";
import { ImageUploader } from "./image-uploader";
import { toast } from "./admin-form";

/** Top-of-page creation: full banner form + direct artboard upload in a
    modal (supports both `hero` minimalist slides and `brand` world cards). */
export function BannerCreateButton({
  create, initialSlot = "hero", heroes = [],
}: {
  initialSlot?: "hero" | "brand" | "navigation";
  heroes?: { id: string; title: string | null; src: string }[];
  create: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState<"hero" | "brand" | "navigation">(initialSlot);
  const [heroId, setHeroId] = useState("");
  const [src, setSrc] = useState("");
  const [separateMobile,setSeparateMobile]=useState(false);
 const [mobileSrc,setMobileSrc]=useState("");const [mobilePoster,setMobilePoster]=useState("");
  const [fallback, setFallback] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || mediaBusy || !src) return;
    setBusy(true);
    try {
      await create(new FormData(e.currentTarget));
      toast("Banner published", "ok");
      setOpen(false);
      setSrc("");
      setHeroId("");
      setFallback("");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Create failed", "bad");
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1 w-full border border-ink/20 bg-white px-3 py-2";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 cursor-pointer items-center gap-2 bg-ink px-5 py-2.5 text-sm text-white transition hover:bg-ink/85"
      >
        <Plus className="size-4" /> {initialSlot === "navigation" ? "Add menu banner" : "New banner"}
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
                <select
                  name="slot"
                  className={field}
                  value={slot}
                  onChange={(e) => setSlot(e.target.value as "hero" | "brand" | "navigation")}
                >
                  <option value="hero">hero (homepage fullscreen slider)</option>
                  <option value="navigation">navigation (shop menu campaign)</option>
                  <option value="brand">brand (Worlds of Misk Al Ghazaal card)</option>
                </select>
              </label>
              <label className="block">
                Order
                <input name="sort" type="number" defaultValue={0} className={field} />
              </label>

              <div className="md:col-span-2">
                {slot === "navigation" && <label className="mb-4 block">Reuse a homepage hero image
                  <select className={field} value={heroId} onChange={(event) => { setHeroId(event.target.value); setSrc(heroes.find((hero) => hero.id === event.target.value)?.src || ""); }}>
                    <option value="">Upload a new image instead</option>
                    {heroes.map((hero) => <option key={hero.id} value={hero.id}>{hero.title || "Untitled hero"}</option>)}
                  </select>
                  <input type="hidden" name="hero_id" value={heroId} />
                </label>}
                <p className="mb-1 text-sm font-medium">Artwork * — navigation: 800 × 1000 px recommended (4:5)</p>
                {/\.mp4$/i.test(src) ? <video src={src} poster={fallback} controls muted className="aspect-video w-full" /> : src ? (
                  <img
                    src={src}
                    alt=""
                    className="aspect-[16/9] w-full border border-ink/10 bg-sand object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center border border-dashed border-ink/25 bg-white text-xs text-ink/50">
                    Upload the banner art below
                  </div>
                )}
                <div className="mt-2">
                  <ImageUploader bucket="banners" prefix="banner" onUploaded={(url) => { setHeroId(""); setSrc(url); }} />
                </div>
                {slot === "hero" && <HeroVideoUploader onBusyChange={setMediaBusy} onUploaded={(video, poster) => { setSrc(video); setFallback(poster); }} />}
                <input type="hidden" name="src" value={src} />
              </div>

              <div className="md:col-span-2">
                <p className="mb-1 text-sm font-medium">
                  Fallback art (optional — shown if artwork 404s)
                </p>
                {fallback && (
                  <img
                    src={fallback}
                    alt=""
                    className="mb-2 aspect-[16/9] w-full border border-ink/10 bg-sand object-cover"
                  />
                )}
                <ImageUploader
                  bucket="banners"
                  prefix="banner-fallback"
                  onUploaded={setFallback}
                />
                <input type="hidden" name="fallback" value={fallback} />
                <label className="my-4 block"><input type="checkbox" name="separate_mobile" checked={separateMobile} onChange={e=>setSeparateMobile(e.target.checked)}/> Separate mobile artwork</label>
                <input type="hidden" name="mobile_src" value={mobileSrc}/><input type="hidden" name="mobile_fallback" value={mobilePoster}/>
                {separateMobile&&<div className="border p-4"><p>Mobile image or video</p><ImageUploader bucket="banners" prefix="mobile" onBusyChange={setMediaBusy} onUploaded={setMobileSrc}/><HeroVideoUploader onBusyChange={setMediaBusy} onUploaded={(src,poster)=>{setMobileSrc(src);setMobilePoster(poster);}}/>{mobileSrc&&<p className="break-all text-xs">{mobileSrc}</p>}</div>}
              </div>

              {slot === "hero" ? (
                <>
                  <label className="block md:col-span-2">
                    Text Position on Banner
                    <select name="eyebrow" defaultValue="bottom-left" className={field}>
                      <option value="bottom-left">Bottom-Left Corner</option>
<option value="bottom-center">Bottom Centre</option>
                      <option value="center">Dead Center</option>
                    </select>
                  </label>
                  <label className="block">
                    Single-Line Text (EN — optional)
                    <input
                      name="title"
                      placeholder="Misk Al Ghazaal"
                      className={field}
                    />
                  </label>
                  <label className="block">
                    Single-Line Text (AR — optional)
                    <input name="title_ar" placeholder="مسك الغزال" className={field} />
                  </label>
                  <label className="block">
                    Optional Button Text (EN)
                    <input name="cta" placeholder="Discover" className={field} />
                  </label>
                  <label className="block">
                    Optional Button Text (AR)
                    <input name="cta_ar" placeholder="اكتشف" className={field} />
                  </label>
                  <label className="block">
                    Optional Button Link
                    <input
                      name="href"
                      placeholder="/collection/…"
                      dir="ltr"
                      className={field}
                    />
                  </label>
                  <label className="block">
                    Alt text
                    <input name="alt" placeholder="Misk Al Ghazaal" className={field} />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    Card Subtitle / Eyebrow (EN)
                    <input
                      name="eyebrow"
                      placeholder="Signature Parfums & Pure Misk"
                      className={field}
                    />
                  </label>
                  <label className="block">
                    Card Subtitle / Eyebrow (AR)
                    <input
                      name="eyebrow_ar"
                      placeholder="العطور التوقيعية والمسك الخالص"
                      className={field}
                    />
                  </label>
                  <label className="block">
                    Campaign / World Title (EN)
                    <input name="title" placeholder="Misk Al Ghazaal" className={field} />
                  </label>
                  <label className="block">
                    Campaign / World Title (AR)
                    <input name="title_ar" placeholder="مسك الغزال" className={field} />
                  </label>
                  <label className="block md:col-span-2">
                    Short Description (EN — optional)
                    <textarea name="desc" rows={2} className={field} />
                  </label>
                  <label className="block md:col-span-2">
                    Short Description (AR — optional)
                    <textarea name="desc_ar" rows={2} className={field} />
                  </label>
                  <label className="block">
                    Link Label (EN — optional)
                    <input name="cta" placeholder="Enter Gallery" className={field} />
                  </label>
                  <label className="block">
                    Link Label (AR — optional)
                    <input name="cta_ar" placeholder="ادخل المعرض" className={field} />
                  </label>
                  <label className="block">
                    Destination Link
                    <input
                      name="href"
                      placeholder="/collection/…"
                      dir="ltr"
                      className={field}
                    />
                  </label>
                  <label className="block">
                    Alt text
                    <input name="alt" className={field} />
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={busy || mediaBusy || !src}
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
