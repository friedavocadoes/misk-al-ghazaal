"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border border-ink/20 px-4 py-2 text-sm"
    >
      Print packing slip
    </button>
  );
}
