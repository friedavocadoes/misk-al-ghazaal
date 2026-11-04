"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { privateOrderPath } from "@/lib/analytics/shared";
import { savePrivacyChoice, usePrivacyChoice } from "@/lib/analytics/consent-client";

const OPEN_EVENT = "misk-open-privacy";
const SEEN_KEY = "misk-privacy-notice-seen";

export function PrivacySettingsButton() {
  const t = useTranslations("Legal");
  return (
    <button type="button" className="cursor-pointer underline underline-offset-4" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {t("settings")}
    </button>
  );
}

export function PrivacyNotice() {
  const t = useTranslations("Legal");
  const choice = usePrivacyChoice();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const notice = useRef<HTMLElement>(null);
  const showNotice = dismissed === false && choice === undefined && !open && !privateOrderPath(pathname);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    queueMicrotask(() => setDismissed(alreadySeen));
  }, []);

  useEffect(() => {
    if (!showNotice) return;
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
  }, [showNotice]);

  useEffect(() => {
    if (!hovered || !showNotice) return;
    const resumeBrowsing = (event: Event) => {
      if (notice.current && event.target instanceof Node && !notice.current.contains(event.target)) dismiss();
    };
    window.addEventListener("pointerdown", resumeBrowsing);
    window.addEventListener("wheel", resumeBrowsing, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", resumeBrowsing);
      window.removeEventListener("wheel", resumeBrowsing);
    };
  }, [dismiss, hovered, showNotice]);

  function save(value: "allow" | "essential", close = false) {
    const saved = savePrivacyChoice(value);
    setFailed(!saved);
    if (saved && close) setOpen(false);
  }

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  return (
    <>
      {showNotice && (
        <aside ref={notice} aria-label={t("settings")} onPointerEnter={(event) => { if (event.pointerType === "mouse" || event.pointerType === "pen") setHovered(true); }} className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 mx-auto max-w-sm rounded-sm border border-ink/10 bg-cream px-3 py-2 text-xs leading-relaxed text-espresso sm:inset-s-auto sm:inset-e-5">
          <p className="pe-7">
            {t("notice")}{" "}
            <button type="button" className="cursor-pointer whitespace-nowrap px-1 py-1 underline underline-offset-4" onClick={() => setOpen(true)}>{t("manage")}</button>{" "}
            <button type="button" className="cursor-pointer whitespace-nowrap px-1 py-1 underline underline-offset-4" onClick={() => save("essential", true)}>{t("essential")}</button>
          </p>
          <button type="button" className="absolute end-1 top-1 cursor-pointer rounded p-1.5 hover:bg-ink/5" aria-label={t("dismissNotice")} onClick={dismiss}>
            <X size={14} aria-hidden="true" />
          </button>
          {failed && <p role="alert" className="mt-2">{t("storageError")}</p>}
        </aside>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="pe-8 text-xl font-medium">{t("settings")}</DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-relaxed text-espresso">{t("settingsDescription")}</DialogDescription>
          <p className="mt-4 text-sm">{t("optionalDescription")}</p>
          <div className="mt-4 flex items-center justify-between gap-4 border-y border-ink/10 py-3 text-sm">
            <label htmlFor="privacy-analytics">{t("analytics")}</label>
            <Switch id="privacy-analytics" checked={choice !== "essential"} onCheckedChange={(enabled) => save(enabled ? "allow" : "essential")} />
          </div>
          <Link href="/pages/privacy" className="mt-3 inline-block text-sm underline underline-offset-4" onClick={() => setOpen(false)}>{t("privacy")}</Link>
          {failed && <p role="alert" className="mt-3 text-sm">{t("storageError")}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

