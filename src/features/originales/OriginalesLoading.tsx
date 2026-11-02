/** Shared by the capsule, its layout and the parent storefront loading boundary. */
export function OriginalesLoading() {
  return (
    <div
      data-originales-loading
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#141612] text-[#c8bea2]"
      role="status"
    >
      <span className="font-serif text-8xl italic" aria-hidden="true">
        O
      </span>
      <span className="text-[10px] tracking-[.3em]">
        MAG PARFUM · ORIGINALES
      </span>
      <span className="sr-only">Loading the collection</span>
    </div>
  );
}
