"use client";

import { useState } from "react";
import { toast } from "./admin-form";
import { ImageUploader } from "./image-uploader";

// Storage uploads publish through an authorized, audited server action.
export function BannerImageField({
  bannerId,
  field,
  label,
  initial,
  revalidate,
}: {
  bannerId: string;
  field: "src" | "fallback";
  label: string;
  initial: string;
  revalidate: (bannerId: string, field: "src" | "fallback", url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(next: string) {
    setSaving(true);
    setSaved(false);
    try {
      await revalidate(bannerId, field, next);
      setUrl(next);
      setDraft(next);
      setSaved(true);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Artwork save failed", "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {url && (
        <img
          src={url}
          alt=""
          className="mt-2 aspect-[16/9] w-full border border-ink/10 bg-sand object-cover"
        />
      )}
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
          placeholder="https://… or /banners/….jpg"
          className="min-w-0 flex-1 border border-ink/20 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={saving || draft === url}
          onClick={() => void save(draft)}
          className="shrink-0 bg-ink px-4 py-2 text-sm text-white transition hover:bg-ink/85 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <div className="mt-2">
        <ImageUploader
          bucket="banners"
          prefix={field}
          onUploaded={(u) => void save(u)}
        />
      </div>
      {saved && <p className="mt-1 text-xs text-ink/60">Saved.</p>}
    </div>
  );
}
