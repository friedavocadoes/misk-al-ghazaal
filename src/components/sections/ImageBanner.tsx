import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

/** Slim horizontal image banner (admin homepage sections): full-bleed
    artwork with optional caption + CTA. The quiet palate cleanser
    between commerce blocks. */
export function ImageBanner({
  src,
  href,
  title,
  cta,
}: {
  src: string;
  href?: string;
  title?: string;
  cta?: string;
}) {
  if (!src) return null;
  const art = (
    <span className="group relative block h-64 overflow-hidden border border-ink/10 bg-ink md:h-80">
      <Image
        src={src}
        alt={title ?? ""}
        fill
        sizes="100vw"
        loading="lazy"
        className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-4 z-10 border border-gold-soft/30"
      />
      {(title || cta) && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/30 px-6 text-center">
          {title && (
            <span className="max-w-2xl font-display text-3xl leading-tight text-cream md:text-5xl">
              {title}
            </span>
          )}
          {cta && (
            <span className="inline-flex items-center gap-2 border border-gold-soft/60 bg-cream px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition-all duration-300 group-hover:bg-gold-wash">
              <span>{cta}</span>
              <ArrowUpRight className="size-3.5 text-gold" />
            </span>
          )}
        </span>
      )}
    </span>
  );
  return href ? (
    <Link href={href} aria-label={title ?? "Banner"} className="block py-6">
      {art}
    </Link>
  ) : (
    <div className="py-6">{art}</div>
  );
}
