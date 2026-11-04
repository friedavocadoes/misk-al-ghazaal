import { OriginalesLoadingMark } from "./OriginalesLoadingMark";
import "./transition.css";

/** Shared by the capsule, its layout and the parent storefront loading boundary. */
export function OriginalesLoading({
  phase = "fallback",
  journey,
}: {
  phase?: "fallback" | "entering" | "leaving" | "arrival" | "arrived";
  journey?: "threshold";
}) {
  return (
    <div
      data-originales-loading
      data-loading-phase={phase}
      data-loading-journey={journey}
      role={phase === "leaving" || phase === "arrived" ? undefined : "status"}
      aria-hidden={phase === "leaving" || phase === "arrived" || undefined}
    >
      {journey === "threshold" && (
        <span className="originales-threshold" aria-hidden="true">
          <span />
          <span />
          <i />
        </span>
      )}
      <span className="originales-transition-seal" aria-hidden="true">
        {phase !== "arrived" && <OriginalesLoadingMark />}
      </span>
      {journey === "threshold" && (
        <div className="originales-transition-credit" aria-hidden="true">
          <span>MAG PARFUM PRESENTS</span>
          <strong>Originales</strong>
        </div>
      )}
      <span className="sr-only">Loading the collection</span>
    </div>
  );
}
