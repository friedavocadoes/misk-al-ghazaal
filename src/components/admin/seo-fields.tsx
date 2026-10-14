/** Shared SEO fieldset for the product editor (§07) and the generic SEO
    editor — plain inputs inside the surrounding AdminForm. All optional. */

export interface SeoFieldValues {
  h1?: string | null;
  h1_ar?: string | null;
  meta_title?: string | null;
  meta_title_ar?: string | null;
  meta_description?: string | null;
  meta_description_ar?: string | null;
  canonical?: string | null;
  robots?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  schema_json?: unknown;
}

const inputCls = "mt-1 w-full border border-ink/20 px-3 py-2";

export function SeoFields({ initial }: { initial?: SeoFieldValues | null }) {
  const v = initial ?? {};
  const schemaText =
    v.schema_json && typeof v.schema_json === "object" && Object.keys(v.schema_json).length
      ? JSON.stringify(v.schema_json, null, 2)
      : "";
  return (
    <>
      <label className="block">
        H1 override (page headline for crawlers — replaces the visible H1)
        <input name="seo_h1" defaultValue={v.h1 ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block">
        H1 Arabic
        <input name="seo_h1_ar" defaultValue={v.h1_ar ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block">
        Meta title
        <input name="seo_meta_title" defaultValue={v.meta_title ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block">
        Meta title Arabic
        <input name="seo_meta_title_ar" defaultValue={v.meta_title_ar ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block md:col-span-2">
        Meta description
        <textarea name="seo_meta_description" rows={2} defaultValue={v.meta_description ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block md:col-span-2">
        Meta description Arabic
        <textarea name="seo_meta_description_ar" rows={2} defaultValue={v.meta_description_ar ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block">
        Canonical URL (blank = auto)
        <input name="seo_canonical" defaultValue={v.canonical ?? ""} placeholder="https://…" dir="ltr" className={`${inputCls} font-mono text-[13px]`} />
      </label>
      <label className="block">
        Robots
        <select name="seo_robots" defaultValue={v.robots ?? ""} className={inputCls}>
          <option value="">index, follow (default)</option>
          <option value="noindex, follow">noindex, follow</option>
          <option value="noindex, nofollow">noindex, nofollow</option>
          <option value="index, nofollow">index, nofollow</option>
        </select>
      </label>
      <label className="block">
        OG title (social share)
        <input name="seo_og_title" defaultValue={v.og_title ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block">
        OG image URL
        <input name="seo_og_image" defaultValue={v.og_image ?? ""} placeholder="https://…" dir="ltr" className={`${inputCls} font-mono text-[13px]`} />
      </label>
      <label className="block md:col-span-2">
        OG description
        <textarea name="seo_og_description" rows={2} defaultValue={v.og_description ?? ""} className={inputCls} dir="auto" />
      </label>
      <label className="block md:col-span-2">
        Extra schema (JSON-LD object — merged over the auto schema)
        <textarea
          name="seo_schema"
          rows={6}
          defaultValue={schemaText}
          spellCheck={false}
          dir="ltr"
          placeholder={'{\n  "@type": "FAQPage",\n  "mainEntity": []\n}'}
          className={`${inputCls} font-mono text-[13px]`}
        />
        <span className="mt-1 block text-xs text-ink/50">
          Must be a JSON object. Invalid JSON blocks the save with an error.
        </span>
      </label>
    </>
  );
}

/** Pull the seo_* fields out of submitted FormData (empty = clear). */
export function readSeoFields(formData: FormData) {
  const text = (k: string) => {
    const val = String(formData.get(k) ?? "").trim();
    return val || null;
  };
  return {
    h1: text("seo_h1"),
    h1_ar: text("seo_h1_ar"),
    meta_title: text("seo_meta_title"),
    meta_title_ar: text("seo_meta_title_ar"),
    meta_description: text("seo_meta_description"),
    meta_description_ar: text("seo_meta_description_ar"),
    canonical: text("seo_canonical"),
    robots: text("seo_robots"),
    og_title: text("seo_og_title"),
    og_description: text("seo_og_description"),
    og_image: text("seo_og_image"),
    schemaRaw: String(formData.get("seo_schema") ?? ""),
  };
}
