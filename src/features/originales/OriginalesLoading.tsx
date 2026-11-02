import { OriginalesLoadingMark } from "./OriginalesLoadingMark";

/** Shared by the capsule, its layout and the parent storefront loading boundary. */
export function OriginalesLoading() {
  return (
    <div
      data-originales-loading
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#141612] text-[#c8bea2]"
      role="status"
    >
      <OriginalesLoadingMark />
      <span className="text-[10px] tracking-[.3em]">
        MAG PARFUM · ORIGINALES
      </span>
      <span className="sr-only">Loading the collection</span>
    </div>
  );
}
