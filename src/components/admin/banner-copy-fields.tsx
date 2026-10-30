import type { BannerPlacement } from "@/lib/banner-config";
export type BannerCopy = Partial<
  Record<
    | "title"
    | "title_ar"
    | "eyebrow"
    | "eyebrow_ar"
    | "desc"
    | "desc_ar"
    | "cta"
    | "cta_ar"
    | "href"
    | "alt"
    | "fit"
    | "focal",
    string | null
  >
>;
export function BannerCopyFields({
  slot,
  values = {},
}: {
  slot: BannerPlacement;
  values?: BannerCopy;
}) {
  const field = (name: keyof BannerCopy, label: string, placeholder = "") => (
    <label className="banner-field">
      {label}
      <input
        name={name}
        defaultValue={values[name] || ""}
        placeholder={placeholder}
      />
    </label>
  );
  return (
    <div className="banner-copy-fields">
      <div className="banner-form-grid">
        {field("title", "Heading", "Optional heading")}
        {field(
          "alt",
          "Image description",
          "Describe the artwork for accessibility",
        )}
      </div>
      {slot === "hero" ? (
        <label className="banner-field">
          Text position
          <select
            name="eyebrow"
            defaultValue={
              ["center", "bottom-center"].includes(values.eyebrow || "")
                ? values.eyebrow!
                : "bottom-left"
            }
          >
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-center">Bottom centre</option>
            <option value="center">Centre</option>
          </select>
        </label>
      ) : (
        <>
          {field("eyebrow", "Subtitle")}
          {field("desc", "Short description")}
        </>
      )}
      <div className="banner-form-grid">
        {field("cta", "Button / link label", "Discover")}
        {field("href", "Destination", "/collection/all")}
      </div>
      <details className="banner-form-details">
        <summary>Arabic translation</summary>
        <div className="banner-form-grid mt-4">
          {field("title_ar", "Heading (Arabic)")}
          {field("cta_ar", "Button label (Arabic)")}
          {slot !== "hero" && (
            <>
              {field("eyebrow_ar", "Subtitle (Arabic)")}
              {field("desc_ar", "Description (Arabic)")}
            </>
          )}
        </div>
      </details>
      <details className="banner-form-details">
        <summary>Image positioning</summary>
        <div className="banner-form-grid mt-4">
          <label className="banner-field">
            Image fit
            <select name="fit" defaultValue={values.fit || "cover"}>
              <option value="cover">Fill the frame (cover)</option>
              <option value="contain">Show the full image (contain)</option>
            </select>
          </label>
          {field("focal", "Focal point", "center or 50% 30%")}
        </div>
      </details>
    </div>
  );
}
