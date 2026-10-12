import Link from "next/link";
import Image from "next/image";

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
    <span className="relative block h-44 overflow-hidden bg-sand md:h-60">
      <Image
        src={src}
        alt={title ?? ""}
        fill
        sizes="100vw"
        loading="lazy"
        className="object-cover"
      />
      {(title || cta) && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/25 px-5 text-center">
          {title && (
            <span className="max-w-2xl font-display text-3xl leading-tight text-white md:text-5xl">
              {title}
            </span>
          )}
          {cta && (
            <span className="bg-white px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
              {cta}
            </span>
          )}
        </span>
      )}
    </span>
  );
  return href ? (
    <Link href={href} aria-label={title ?? "Banner"} className="block">
      {art}
    </Link>
  ) : (
    <div>{art}</div>
  );
}
