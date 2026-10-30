"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Power, Trash2 } from "lucide-react";
import { type AdminBanner, BANNER_PLACEMENTS } from "@/lib/banner-config";
import { AdminForm, SaveButton, toast } from "./admin-form";
import { BannerCopyFields, type BannerCopy } from "./banner-copy-fields";
import { BannerMediaUpload } from "./banner-media-upload";
import {
  saveBanner,
  saveBannerMedia,
  setBannerEnabled,
  moveToBin,
} from "@/app/admin/banners/actions";

export function BannerEditor({ banner }: { banner: AdminBanner & BannerCopy }) {
  const router = useRouter(),
    [enabled, setEnabled] = useState(banner.is_active),
    [pending, setPending] = useState(false);
  const [desktopBusy, setDesktopBusy] = useState(false),
    [mobileBusy, setMobileBusy] = useState(false);
  const [desktop, setDesktop] = useState({
      src: banner.src,
      poster: banner.fallback || "",
    }),
    [mobile, setMobile] = useState({
      src: banner.mobile_src || "",
      poster: banner.mobile_fallback || "",
    });
  const [separate, setSeparate] = useState(!!banner.mobile_src),
    [error, setError] = useState("");
  const locked = pending || desktopBusy || mobileBusy,
    placement = BANNER_PLACEMENTS[banner.slot];
  async function media(
    device: "desktop" | "mobile",
    src: string,
    poster: string,
  ) {
    await saveBannerMedia(banner.id, device, src, poster);
    (device === "desktop" ? setDesktop : setMobile)({ src, poster });
    toast(`${device === "desktop" ? "Desktop" : "Mobile"} artwork saved`);
  }
  async function toggle() {
    if (locked) return;
    setPending(true);
    setError("");
    try {
      await setBannerEnabled(banner.id, !enabled);
      setEnabled(!enabled);
      toast(enabled ? "Banner disabled" : "Banner enabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change visibility");
    } finally {
      setPending(false);
    }
  }
  async function switchToSharedArtwork() {
    if (locked) return;
    setPending(true);
    setError("");
    try {
      await media("mobile", "", "");
      setSeparate(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update mobile artwork",
      );
    } finally {
      setPending(false);
    }
  }
  async function remove() {
    if (
      locked ||
      !confirm(
        banner.slot === "navigation"
          ? "Permanently delete this menu banner and unused artwork?"
          : "Move this banner to the recycle bin?",
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("id", banner.id);
      await moveToBin(form);
      toast("Banner removed");
      router.push(`/admin/banners?slot=${banner.slot}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete banner");
      setPending(false);
    }
  }
  return (
    <main className="admin-workspace banner-admin-workspace">
      <header className="banner-page-heading">
        <div>
          <Link
            href={`/admin/banners?slot=${banner.slot}`}
            className="text-xs text-fog"
          >
            ← {placement.label}
          </Link>
          <h1 className="mt-3">{banner.title || "Untitled banner"}</h1>
          <p>
            Order {banner.sort} · {placement.label} ·{" "}
            <span className={`banner-state ${enabled ? "is-live" : ""}`}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
          </p>
        </div>
        <div className="banner-heading-actions">
          <button
            className="banner-quiet"
            onClick={() => void toggle()}
            disabled={locked}
          >
            <Power size={15} />
            {enabled ? "Disable banner" : "Enable banner"}
          </button>
          <button
            className="banner-delete"
            onClick={() => void remove()}
            disabled={locked}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </header>
      {!enabled && (
        <div className="banner-disabled-notice">
          This banner is saved but hidden from the storefront. Enable it when
          you are ready.
        </div>
      )}
      {error && (
        <p role="alert" className="my-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {locked && (
        <p role="status" className="banner-upload-status">
          <Loader2 className="size-4 animate-spin" />
          {desktopBusy || mobileBusy
            ? "Preparing artwork — keep this page open."
            : "Saving changes…"}
        </p>
      )}
      <div className="banner-editor-layout">
        <div className="space-y-6">
          <section className="banner-editor-panel">
            <div className="banner-panel-heading">
              <h2>Desktop artwork</h2>
              <p>{placement.dimensions}. Uploads save automatically.</p>
            </div>
            <BannerMediaUpload
              src={desktop.src}
              poster={desktop.poster}
              allowVideo={placement.allowVideo}
              disabled={pending || mobileBusy}
              onBusyChange={setDesktopBusy}
              onChange={(src, poster) => media("desktop", src, poster)}
            />
          </section>
          <section className="banner-editor-panel">
            <div className="banner-panel-heading">
              <h2>Mobile artwork</h2>
              <p>
                Only the matching screen’s media is downloaded. Choose a
                portrait crop for mobile heroes.
              </p>
            </div>
            <label className="banner-option">
              <input
                type="checkbox"
                checked={separate}
                disabled={locked}
                onChange={(e) => {
                  if (e.target.checked) setSeparate(true);
                  else void switchToSharedArtwork();
                }}
              />
              <span>
                Use separate mobile artwork
                <small>
                  {mobile.src
                    ? "Separate artwork is saved."
                    : separate
                      ? "Upload below to activate; the shared artwork remains in use until then."
                      : "Currently uses the same artwork as desktop."}
                </small>
              </span>
            </label>
            {separate && (
              <div className="mt-5">
                <BannerMediaUpload
                  device="mobile"
                  src={mobile.src}
                  poster={mobile.poster}
                  allowVideo={placement.allowVideo}
                  disabled={pending || desktopBusy}
                  onBusyChange={setMobileBusy}
                  onChange={(src, poster) => media("mobile", src, poster)}
                />
              </div>
            )}
          </section>
        </div>
        <section className="banner-editor-panel">
          <div className="banner-panel-heading">
            <h2>Content & layout</h2>
            <p>
              Copy changes use the Save button. Reorder banners from the
              placement list.
            </p>
          </div>
          <AdminForm action={saveBanner} success="Banner content saved">
            <input type="hidden" name="id" value={banner.id} />
            <fieldset disabled={locked}>
              <BannerCopyFields slot={banner.slot} values={banner} />
              <SaveButton className="mt-6 w-full">Save content</SaveButton>
            </fieldset>
          </AdminForm>
        </section>
      </div>
    </main>
  );
}
