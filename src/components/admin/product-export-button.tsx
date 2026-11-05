"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "./admin-form";
export function ProductExportButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      className="flex items-center gap-2 rounded border border-ink/20 bg-white px-4 py-2 text-sm disabled:opacity-50"
      onClick={async () => {
        setPending(true);
        try {
          const response = await fetch("/api/admin/products/export", {
            cache: "no-store",
          });
          if (!response.ok) {
            const body = await response.json();
            throw new Error(body.error || "Export failed");
          }
          const url = URL.createObjectURL(await response.blob()),
            anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "products.xlsx";
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (error) {
          toast(
            error instanceof Error ? error.message : "Export failed",
            "bad",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {pending ? "Preparing Excel…" : "Export all · Excel"}
    </button>
  );
}
