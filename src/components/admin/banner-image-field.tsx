"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUploader } from "./image-uploader";

// Edits one image column (src/fallback) of a banner directly (super_admin
// RLS on the browser client). Shows the live preview so you know what
// you're changing.
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
  revalidate?: (bannerId: string, field: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(next: string) {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase.from("banners").update({ [field]: next }).eq("id", bannerId);
    setUrl(next);
    setDraft(next);
    // Browser-client write: refresh the homepage explicitly (the action
    // also records the audit row for this artwork change).
    if (revalidate) await revalidate(bannerId, field);
    setSaving(false);
    setSaved(true);
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
