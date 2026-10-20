"use client";
import { useState } from "react";
export function HeroVideoUploader({ onUploaded, onBusyChange }: { onBusyChange?: (busy: boolean) => void; onUploaded: (src: string, poster: string) => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="mt-4 border-t border-ink/10 pt-4 text-sm">
    <label className="inline-block cursor-pointer border border-ink/20 px-4 py-2">{busy ? "Optimizing video… keep this page open" : "Drop video here or upload"}
      <input type="file" accept="video/*" disabled={busy} className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        if (file.size > 30 * 1024 * 1024) { setError("Maximum source size: 30 MB."); return; }
        setBusy(true); onBusyChange?.(true); setError("");
        try {
          const body = new FormData(); body.set("file", file);
          const response = await fetch("/api/admin/hero-video", { method: "POST", body });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          await onUploaded(data.src, data.poster);
        } catch (failure) { setError(failure instanceof Error ? failure.message : "Upload failed"); }
        finally { setBusy(false); onBusyChange?.(false); }
      }} />
    </label>
    <p className="mt-2 text-xs text-ink/60">Up to 30 MB. Export uses the first 20 seconds, maximum 1920 × 1080, 30fps, silent H.264 MP4 with a WebP poster. Publish after processing completes.</p>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>;
}
