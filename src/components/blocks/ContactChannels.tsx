import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mail, MapPin, Phone, Smartphone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { CopyButton } from "@/components/ui/copy-button";
import {
  INSTAGRAM_URL,
  SITE,
  STORE_CONTACT,
  waLink,
} from "@/lib/site";
import type { Locale } from "@/i18n/routing";

/** Direct-line cards above the form: chat, call, landline, social, email —
    plus the way back to Locate Us. Every card is the action itself. */
export async function ContactChannels({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Contact" });

  const cards = [
    {
      href: waLink(STORE_CONTACT.shopMobile),
      external: true,
      icon: (
        <WhatsAppIcon className="size-[22px] text-[#1e7a46]" />
      ),
      name: t("channelChat"),
      value: STORE_CONTACT.shopMobile,
      ltr: true,
    },
    {
      href: `tel:${STORE_CONTACT.shopMobile.replace(/\s/g, "")}`,
      external: false,
      icon: <Smartphone className="size-5 text-gold" strokeWidth={1.5} />,
      name: t("channelCall"),
      value: STORE_CONTACT.shopMobile,
      ltr: true,
    },
    {
      href: `tel:${STORE_CONTACT.landline.replace(/\s/g, "")}`,
      external: false,
      icon: <Phone className="size-5 text-gold" strokeWidth={1.5} />,
      name: t("channelLandline"),
      value: STORE_CONTACT.landline,
      ltr: true,
    },
    {
      href: INSTAGRAM_URL,
      external: true,
      icon: <InstagramIcon className="size-5 text-gold" />,
      name: "Instagram",
      value: "@misk.al.ghazaal",
      ltr: true,
    },
    {
      href: `mailto:${SITE.email}`,
      external: false,
      icon: <Mail className="size-5 text-gold" strokeWidth={1.5} />,
      name: "Email",
      value: SITE.email,
      ltr: true,
    },
  ];

  return (
    <div className="mb-12">
      <p className="text-center font-display text-2xl text-ink md:text-[28px]">
        {t("channelsTitle")}
      </p>
      <p className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-espresso">
        {t("channelsText")}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.name + c.value}
            className="group flex items-center gap-3 border border-ink/10 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_16px_32px_-20px_rgba(28,25,23,0.4)]"
          >
            <a
              href={c.href}
              {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="flex min-w-0 flex-1 items-center gap-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-cream transition-colors group-hover:border-gold/40">
                {c.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
                  {c.name}
                </span>
                <span
                  className="mt-0.5 block truncate text-[15px] font-medium text-ink"
                  dir={c.ltr ? "ltr" : undefined}
                >
                  {c.value}
                </span>
              </span>
            </a>
            <CopyButton value={c.value} label={t("copyNumber")} />
          </div>
        ))}

        {/* The way to the doors: locations, hours, directions. */}
        <Link
          href="/locate-us"
          className="group flex items-center gap-4 border border-gold/50 bg-gold-wash/60 p-5 transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_16px_32px_-20px_rgba(138,109,47,0.5)]"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors group-hover:bg-gold group-hover:text-ink">
            <MapPin className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
              {t("channelVisit")}
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-medium text-ink">
              {t("visitCta")}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
