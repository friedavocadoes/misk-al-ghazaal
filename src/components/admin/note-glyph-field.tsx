"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_NOTE_GLYPH, NoteGlyph } from "@/components/ui/note-glyphs";
import { useAdminForm, toast } from "./admin-form";

export function NoteGlyphField({ initial, noteId = "new" }: { initial?: string | null; noteId?: string }) {
  const initialSrc = initial?.startsWith("https://") || initial?.startsWith("/") ? initial : DEFAULT_NOTE_GLYPH;
  const [src, setSrc] = useState(initialSrc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valueRef = useRef<HTMLInputElement>(null);
  const { pending } = useAdminForm();
  const inputId = useId();

  // Uploading only stages Storage artwork. The note URL persists with the enclosing save action.
  useEffect(() => {
    const form = valueRef.current?.form;
    const guard = (event: Event) => {
      if (busy) { event.preventDefault(); event.stopImmediatePropagation(); toast("Wait for the artwork upload to finish.", "bad"); }
    };
    form?.addEventListener("submit", guard, true);
    return () => form?.removeEventListener("submit", guard, true);
  }, [busy]);

  function commit(url: string) {
    flushSync(() => setSrc(url));
    if (valueRef.current) {
      valueRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  async function upload(file: File) {
    setError("");
    if (!["image/png", "image/webp", "image/avif"].includes(file.type)) { setError("Use a PNG, WebP or AVIF image. PNG is ideal for transparent drawings."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Artwork must be 2 MB or smaller."); return; }
    setBusy(true);
    try {
      const ext = file.type.split("/")[1];
      const path = `note-glyphs/${noteId}-${crypto.randomUUID()}.${ext}`;
      const sb = createClient();
      const { error: failure } = await sb.storage.from("products").upload(path, file, { contentType: file.type, upsert: false });
      if (failure) throw failure;
      commit(sb.storage.from("products").getPublicUrl(path).data.publicUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <fieldset className="flex w-full flex-wrap items-center gap-5 border border-ink/10 bg-sand/30 p-4">
      <legend className="px-2 text-xs font-medium">Hand-drawn glyph</legend>
      <input ref={valueRef} type="hidden" name="glyph" value={src} readOnly />
      <span className="glyph-upload-preview flex size-24 items-center justify-center border border-ink/10"><NoteGlyph glyph={src} className="size-20" /></span>
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className={`inline-flex items-center gap-2 border border-ink/25 bg-white px-3 py-2 text-xs ${pending || busy ? "opacity-50" : "cursor-pointer hover:border-gold"}`}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}{busy ? "Uploading…" : "Upload artwork"}
        </label>
        <input id={inputId} type="file" disabled={pending || busy} accept="image/png,image/webp,image/avif" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
        {src !== DEFAULT_NOTE_GLYPH && <button type="button" disabled={pending || busy} onClick={() => commit(DEFAULT_NOTE_GLYPH)} className="ms-4 cursor-pointer text-xs text-fog underline underline-offset-4">Use default</button>}
        <p className="mt-2 text-xs leading-relaxed text-fog">Transparent PNG / WebP / AVIF · up to 2 MB. Use a square canvas with a little breathing room. Original colors are preserved.</p>
        <p className="mt-1 text-xs text-fog">Save the note to publish the artwork.</p>
        {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
    </fieldset>
  );
}
