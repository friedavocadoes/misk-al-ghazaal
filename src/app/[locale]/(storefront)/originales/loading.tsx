export default function LoadingOriginales() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f3f0e9] text-[#81745d]"
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
