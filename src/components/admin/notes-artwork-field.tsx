"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { ImageUploader } from "./image-uploader";
import { toast } from "./admin-form";

/** Upload-first artwork field: preview + upload/remove auto-persist
    through the given server action (no separate save step to forget). */
export function NotesArtworkField({
  productId,
  slug,
  field,
  label,
  initial,
  save,
}: {
  productId: string;
  slug: string;
  field: "notes_image_desktop" | "notes_image_mobile";
  label: string;
  initial: string;
  save: (productId: string, field: string, url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);

  const persist = async (next: string) => {
    setBusy(true);
    try {
      await save(productId, field, next);
      setUrl(next);
      toast(next ? "Artwork saved" : "Artwork removed", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "bad");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-ink/10 bg-white p-4">
      <p className="text-sm font-medium">{label}</p>
      {url ? (
        <div className="relative mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="max-h-48 w-full border border-ink/10 object-cover" />
          <button
            type="button"
            disabled={busy}
            onClick={() => void persist("")}
            className="absolute right-2 top-2 flex items-center gap-1.5 bg-ink px-3 py-1.5 text-xs text-white transition hover:bg-[#9c2b2e] disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Remove
          </button>
        </div>
      ) : (
        <div className="mt-3 flex h-28 items-center justify-center border border-dashed border-ink/25 bg-cream text-xs text-ink/50">
          {busy ? <Loader2 className="size-5 animate-spin" /> : "No artwork — upload one below"}
        </div>
      )}
      <div className="mt-3">
        <ImageUploader bucket="products" prefix={`${slug}-notes-${field === "notes_image_desktop" ? "desktop" : "mobile"}`} onUploaded={(u) => void persist(u)} />
        <p className="mt-1 break-all text-xs text-ink/50" dir="ltr">{url || "—"}</p>
      </div>
    </div>
  );
}
