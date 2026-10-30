"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BANNER_PLACEMENTS, type BannerPlacement } from "@/lib/banner-config";
import { BannerMediaUpload } from "./banner-media-upload";
import { BannerCopyFields } from "./banner-copy-fields";
import { toast } from "./admin-form";
export function BannerCreateButton({
  create,
  initialSlot = "hero",
  heroes = [],
}: {
  initialSlot?: BannerPlacement;
  heroes?: { id: string; title: string | null; src: string }[];
  create: (form: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false);
  const [desktopBusy, setDesktopBusy] = useState(false),
    [mobileBusy, setMobileBusy] = useState(false);
  const [separate, setSeparate] = useState(false),
    [enabled, setEnabled] = useState(true),
    [heroId, setHeroId] = useState("");
  const [src, setSrc] = useState(""),
    [poster, setPoster] = useState(""),
    [mobileSrc, setMobileSrc] = useState(""),
    [mobilePoster, setMobilePoster] = useState("");
  const placement = BANNER_PLACEMENTS[initialSlot],
    locked = saving || desktopBusy || mobileBusy;
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || !src || (separate && !mobileSrc)) return;
    setSaving(true);
    setError("");
    try {
      await create(new FormData(event.currentTarget));
      toast(enabled ? "Banner published" : "Disabled banner created");
      setOpen(false);
      setSrc("");
      setPoster("");
      setMobileSrc("");
      setMobilePoster("");
      setSeparate(false);
      setHeroId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create banner");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!locked) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <button className="banner-primary" type="button">
          <Plus size={16} />
          Add banner
        </button>
      </DialogTrigger>
      <DialogContent
        className="banner-create-dialog max-w-4xl rounded-xl p-0"
        onEscapeKeyDown={(e) => {
          if (locked) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (locked) e.preventDefault();
        }}
      >
        <div className="banner-dialog-heading">
          <p className="eyebrow">{placement.label}</p>
          <DialogTitle className="mt-2 text-2xl font-medium">
            Add a banner
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-fog">
            {placement.description} Added at the end; drag to reorder afterward.
          </DialogDescription>
        </div>
        <form onSubmit={submit}>
          <input type="hidden" name="slot" value={initialSlot} />
          <input type="hidden" name="src" value={src} />
          <input type="hidden" name="fallback" value={poster} />
          <input type="hidden" name="mobile_src" value={mobileSrc} />
          <input type="hidden" name="mobile_fallback" value={mobilePoster} />
          <input type="hidden" name="hero_id" value={heroId} />
          <input type="hidden" name="is_active" value={String(enabled)} />
          <input
            type="hidden"
            name="separate_mobile"
            value={separate ? "on" : ""}
          />
          <div className="banner-create-body">
            <section>
              <h3 className="banner-section-title">1. Artwork</h3>
              <p className="banner-upload-hint mb-4">
                {placement.dimensions}. Images are converted to WebP.
              </p>
              {initialSlot === "navigation" && heroes.length > 0 && (
                <label className="banner-field mb-4">
                  Start from a hero image
                  <select
                    value={heroId}
                    disabled={locked}
                    onChange={(e) => {
                      setHeroId(e.target.value);
                      setSrc(
                        heroes.find((h) => h.id === e.target.value)?.src || "",
                      );
                      setPoster("");
                    }}
                  >
                    <option value="">Upload new artwork</option>
                    {heroes.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title || "Untitled hero"}
                      </option>
                    ))}
                  </select>
                  <small>
                    A separate copy is created, so editing this banner will not
                    affect the hero.
                  </small>
                </label>
              )}
              <BannerMediaUpload
                src={src}
                poster={poster}
                allowVideo={placement.allowVideo}
                disabled={saving || mobileBusy}
                onBusyChange={setDesktopBusy}
                onChange={(src, poster) => {
                  setSrc(src);
                  setPoster(poster);
                  setHeroId("");
                }}
              />
              <label className="banner-option mt-5">
                <input
                  type="checkbox"
                  checked={separate}
                  disabled={locked}
                  onChange={(e) => setSeparate(e.target.checked)}
                />
                <span>
                  Use separate mobile artwork
                  <small>
                    Otherwise the same image or video is used on all screens.
                  </small>
                </span>
              </label>
              {separate && (
                <div className="mt-4">
                  <BannerMediaUpload
                    device="mobile"
                    src={mobileSrc}
                    poster={mobilePoster}
                    allowVideo={placement.allowVideo}
                    disabled={saving || desktopBusy}
                    onBusyChange={setMobileBusy}
                    onChange={(src, poster) => {
                      setMobileSrc(src);
                      setMobilePoster(poster);
                    }}
                  />
                </div>
              )}
            </section>
            <section>
              <h3 className="banner-section-title">2. Content & visibility</h3>
              <fieldset disabled={saving}>
                <BannerCopyFields slot={initialSlot} />
              </fieldset>
              <label className="banner-option mt-5">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={saving}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span>
                  Enable on storefront
                  <small>
                    Turn off to prepare the banner without publishing it.
                  </small>
                </span>
              </label>
            </section>
          </div>
          <div className="banner-dialog-footer">
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <p role="status" className="text-xs text-fog">
              {desktopBusy || mobileBusy
                ? "Artwork is being prepared. Keep this window open."
                : separate && !mobileSrc
                  ? "Upload mobile artwork to continue."
                  : "Artwork and copy are saved together when you create the banner."}
            </p>
            <button
              className="banner-primary"
              type="submit"
              disabled={locked || !src || (separate && !mobileSrc)}
            >
              {locked && <Loader2 className="size-4 animate-spin" />}
              {saving
                ? "Creating…"
                : desktopBusy || mobileBusy
                  ? "Preparing artwork…"
                  : enabled
                    ? "Create & enable"
                    : "Create disabled banner"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
