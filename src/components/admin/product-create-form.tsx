"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MultiImageUploader } from "./multi-image-uploader";
import { toast } from "./admin-form";

export interface CreateLists {
  lineups: { id: string; title: string }[];
  rituals: { id: string; title: string }[];
  collections: { id: string; title: string }[];
}

/** Full product creation: details + artboard uploads + first variant +
    collection links in one pass (no Supabase dashboard detours). */
export function ProductCreateForm({
  lists,
  create,
}: {
  lists: CreateLists;
  create: (formData: FormData) => Promise<{ ok: boolean; id?: string; error?: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [prefix] = useState(() => `new-${Date.now()}`);

  const field = "mt-1 w-full border border-ink/20 bg-white px-3 py-2";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("images", JSON.stringify(images));
      const res = await create(fd);
      if (!res.ok) throw new Error(res.error || "Create failed");
      toast("Product created", "ok");
      router.push(`/admin/products/${res.id}`);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Create failed", "bad");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="space-y-3 border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl">Details</h2>
        <label className="block text-sm">
          Title (EN) *
          <input
            name="title"
            required
            placeholder="Midnight Oudh"
            className={field}
            onChange={(e) => {
              const slugInput = (e.currentTarget.form as HTMLFormElement | null)?.elements.namedItem("slug") as HTMLInputElement | null;
              if (slugInput && !slugTouched) {
                slugInput.value = e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
              }
            }}
          />
        </label>
        <label className="block text-sm">
          Title (AR transliteration)
          <input name="title_ar" className={field} />
        </label>
        <label className="block text-sm">
          Slug *
          <input
            name="slug"
            required
            placeholder="midnight-oudh"
            dir="ltr"
            className={field}
            onChange={() => setSlugTouched(true)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Price Dhs *
            <input name="price" type="number" step="0.01" min={0} required className={field} />
          </label>
          <label className="block text-sm">
            Compare-at
            <input name="compare_at" type="number" step="0.01" min={0} className={field} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Lineup
            <select name="lineup_id" className={field} defaultValue="">
              <option value="">— none —</option>
              {lists.lineups.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            How-to-use guide
            <select name="ritual_id" className={field} defaultValue="">
              <option value="">— none —</option>
              {lists.rituals.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 border border-gold/50 bg-gold-wash/60 px-3 py-1.5">
            <input type="checkbox" name="is_active" defaultChecked /> Visible on store
          </label>
          <label><input type="checkbox" name="featured" /> Featured</label>
          <label><input type="checkbox" name="is_new" /> New</label>
          <label><input type="checkbox" name="is_best_seller" /> Best seller</label>
        </div>
        <div>
          <p className="text-sm font-medium">Collections</p>
          <div className="mt-2 grid max-h-44 gap-1 overflow-y-auto border border-ink/10 p-3 text-sm sm:grid-cols-2">
            {lists.collections.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                <input type="checkbox" name="collections" value={c.id} />
                {c.title}
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-display text-xl">Images (direct upload)</h2>
          <div className="mt-3">
            <MultiImageUploader bucket="products" prefix={prefix} images={images} onChange={setImages} />
            <p className="mt-1 text-xs text-ink/60">Straight into the `products` bucket.</p>
          </div>
        </section>

        <section className="space-y-3 border border-ink/10 bg-white p-6">
          <h2 className="font-display text-xl">First variant</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">Size *<input name="v_title" required placeholder="50ml" className={field} /></label>
            <label className="block">Price Dhs *<input name="v_price" type="number" step="0.01" min={0} required className={field} /></label>
            <label className="block">Stock<input name="v_stock" type="number" min={0} defaultValue={25} className={field} /></label>
            <label className="block">SKU<input name="v_sku" className={field} /></label>
          </div>
          <p className="text-xs text-ink/60">More variants can be added on the product page afterwards.</p>
        </section>

        <button
          type="submit"
          disabled={busy}
          className="flex w-full cursor-pointer items-center justify-center gap-2 bg-ink px-4 py-3 text-sm text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {busy ? "Creating…" : "Create product"}
        </button>
      </div>
    </form>
  );
}
