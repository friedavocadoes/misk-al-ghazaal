"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Pencil, X } from "lucide-react";
import { ShopperAvatar } from "@/components/ui/avatar";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

/** Profile medallion: a gold signet ring whose edit seal only surfaces
    on hover; the upload UI (with its fine print) lives in a modal. */
export function AvatarUploader({
  userId,
  name,
  initial,
}: {
  userId: string;
  name: string;
  initial: string | null;
}) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(initial);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const open = () => {
    setError("");
    setSaved(false);
    setModal(true);
  };

  const pick = async (file: File) => {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (!file.type.startsWith("image/")) throw new Error("JPG or PNG only.");
      if (file.size > 3 * 1024 * 1024) throw new Error("Max 3MB.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const sb = createBrowserClient();
      const { error: upError } = await sb.storage.from("avatars").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (upError) throw upError;
      const { data } = sb.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: dbError } = await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (dbError) throw dbError;
      await sb.auth.updateUser({ data: { avatar_url: publicUrl } });
      setUrl(publicUrl);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t("avatarUpload")}
        className="group relative shrink-0 cursor-pointer"
      >
        <ShopperAvatar
          url={url}
          name={name}
          className="size-24 text-4xl ring-1 ring-gold/60 ring-offset-[3px] ring-offset-white transition-shadow group-hover:ring-gold md:size-28"
        />
        <span
          aria-hidden
          className="absolute -bottom-1 -right-1 flex size-8 scale-50 items-center justify-center rounded-full bg-ink text-white opacity-0 shadow-lg transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
        >
          <Pencil className="size-3.5" />
        </span>
      </button>

      {/* Portaled to body: `position: fixed` inside the smoothed content
          would pin to the content, not the viewport (GSAP caveat). */}
      {modal &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("avatarUpload")}
            onClick={() => !busy && setModal(false)}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5 backdrop-blur-[2px]"
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm border border-ink/10 bg-cream p-6 text-center shadow-[0_32px_64px_-24px_rgba(28,25,23,0.5)]"
          >
            <div className="flex items-start justify-between">
              <p className="eyebrow text-gold">{t("profileTitle")}</p>
              <button
                type="button"
                onClick={() => setModal(false)}
                aria-label="Close"
                className="cursor-pointer p-1 text-fog transition hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mx-auto mt-4 w-fit">
              <ShopperAvatar url={url} name={name} className="size-28 text-4xl" />
            </div>
            <label className="mt-5 inline-block cursor-pointer border border-ink bg-ink px-6 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-gold-soft hover:text-ink">
              {busy ? <Loader2 className="size-4 animate-spin" /> : t("avatarUpload")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pick(f);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="mx-auto mt-3 max-w-55 text-[11px] leading-relaxed text-fog">{t("avatarHint")}</p>
            {saved && <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">{t("avatarSaved")}</p>}
            {error && <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{error}</p>}
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
