"use client";

import { Link } from "@/i18n/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import { ArrowUpRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";

export function NavigationCampaigns({ banners, locale, onNavigate }: {
  banners: Banner[];
  locale: Locale;
  onNavigate: () => void;
}) {
  const visible = banners.filter((banner) => banner.src).slice(0, 2);
  if (!visible.length) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {visible.map((banner) => {
        const title = tx(banner.title ?? banner.alt, banner.titleAr, locale);
        const content = (
          <>
            <span className="relative block aspect-[4/5] overflow-hidden bg-sand">
              <SafeImage
                src={banner.src}
                fallback={banner.fallback || banner.src}
                alt={banner.alt}
                fill
                sizes="(max-width: 1023px) 44vw, 22vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                style={{ objectPosition: banner.focal || "center", objectFit: banner.fit || "cover" }}
              />
            </span>
            <span className="mt-3 flex items-start justify-between gap-2 font-display text-lg leading-tight">
              {title}
              {banner.href && <ArrowUpRight className="mt-1 size-4 shrink-0 text-gold" />}
            </span>
            {banner.eyebrow && (
              <span className="mt-1 block text-[10px] tracking-wider text-ink/60">
                {tx(banner.eyebrow, banner.eyebrowAr, locale)}
              </span>
            )}
          </>
        );
        const href = banner.href?.trim();
        const key = banner.id || banner.src;
        if (href && /^\/(?!\/)/.test(href)) {
          return <Link key={key} href={href} onClick={onNavigate} className="group">{content}</Link>;
        }
        if (href && /^https:\/\//i.test(href)) {
          return <a key={key} href={href} onClick={onNavigate} className="group">{content}</a>;
        }
        return <div key={key} className="group">{content}</div>;
      })}
    </div>
  );
}
