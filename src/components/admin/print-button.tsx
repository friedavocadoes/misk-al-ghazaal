"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50 hover:bg-white"
    >
      Print packing slip
    </button>
  );
}
