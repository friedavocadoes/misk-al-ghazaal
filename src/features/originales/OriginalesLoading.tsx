import { OriginalesLoadingMark } from "./OriginalesLoadingMark";
import "./transition.css";

/** Shared by the capsule, its layout and the parent storefront loading boundary. */
export function OriginalesLoading({
  phase = "fallback",
}: {
  phase?: "fallback" | "entering" | "leaving" | "arrival" | "arrived";
}) {
  return (
    <div
      data-originales-loading
      data-loading-phase={phase}
      role={phase === "leaving" || phase === "arrived" ? undefined : "status"}
      aria-hidden={phase === "leaving" || phase === "arrived" || undefined}
    >
      <span className="originales-transition-seal" aria-hidden="true">
        {phase !== "arrived" && <OriginalesLoadingMark />}
      </span>
      <span className="sr-only">Loading the collection</span>
    </div>
  );
}
