"use client";
import { toast } from "./admin-form";
import { useState } from "react";
import { BannerImageField } from "./banner-image-field";
type Field = "src" | "fallback" | "mobile_src" | "mobile_fallback";
export function MobileBannerField({
  id,
  src,
  poster,
  save,
}: {
  id: string;
  src: string;
  poster: string;
  save: (id: string, field: Field, url: string) => Promise<void>;
}) {
  const [separate, setSeparate] = useState(!!src);
  const [busy, setBusy] = useState(false);
  return (
    <section className="border border-ink/10 p-5">
      <label>
        <input
          type="checkbox"
          checked={separate}
          disabled={busy}
          onChange={async (e) => {
            const on = e.target.checked;
            if (on) {
              setSeparate(true);
              return;
            }
            setBusy(true);
            try {
              await save(id, "mobile_src", "");
              await save(id, "mobile_fallback", "");
              setSeparate(false);
            } catch (e) {
              toast(
                e instanceof Error
                  ? e.message
                  : "Could not save mobile setting",
                "bad",
              );
            } finally {
              setBusy(false);
            }
          }}
        />{" "}
        Separate mobile image or video
      </label>
      <p className="my-3 text-xs text-fog">
        Unchecked uses the desktop asset. Recommended mobile hero: 900 × 1600.
      </p>
      {separate && (
        <BannerImageField
          bannerId={id}
          field="mobile_src"
          label="Mobile artwork"
          initial={src}
          allowVideo
          revalidate={save}
        />
      )}
      {separate && poster && <BannerImageField bannerId={id} field="mobile_fallback" label="Mobile video poster / fallback" initial={poster} revalidate={save}/>}
    </section>
  );
}
