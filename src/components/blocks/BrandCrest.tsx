import Image from "next/image";

/** Hover transforms a parent; the reflection keeps its own uninterrupted clock. */
export function BrandCrest({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-crest" data-compact={compact}>
      <span className="brand-crest__lift">
        <Image src="/mag.webp" alt="Misk Al Ghazaal" width={176} height={176} priority className="brand-crest__image" />
        <span className="brand-crest__metal" aria-hidden="true">
          <span className="brand-crest__reflection" />
        </span>
      </span>
    </span>
  );
}
