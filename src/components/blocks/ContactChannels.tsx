import { getTranslations } from "next-intl/server";
import { MagneticContactLink } from "./MagneticContactLink";
import { Mail, MapPin, Phone, Smartphone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { CopyButton } from "@/components/ui/copy-button";
import { INSTAGRAM_URL, SITE, STORE_CONTACT, waLink } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

/** Direct-line cards above the form: chat, call, landline, social, email —
    plus the way back to Locate Us. Every card is the action itself. */
export async function ContactChannels({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Contact" });

  const cards = [
    {
      href: waLink(STORE_CONTACT.shopMobile),
      external: true,
      icon: <WhatsAppIcon className="size-[22px]" />,
      name: t("channelChat"),
      value: STORE_CONTACT.shopMobile,
      ltr: true,
    },
    {
      href: `tel:${STORE_CONTACT.shopMobile.replace(/\s/g, "")}`,
      external: false,
      icon: <Smartphone className="size-5" strokeWidth={1.5} />,
      name: t("channelCall"),
      value: STORE_CONTACT.shopMobile,
      ltr: true,
    },
    {
      href: `tel:${STORE_CONTACT.landline.replace(/\s/g, "")}`,
      external: false,
      icon: <Phone className="size-5" strokeWidth={1.5} />,
      name: t("channelLandline"),
      value: STORE_CONTACT.landline,
      ltr: true,
    },
    {
      href: INSTAGRAM_URL,
      external: true,
      icon: <InstagramIcon className="size-5" />,
      name: "Instagram",
      value: "@gazaalperfumes",
      ltr: true,
    },
    {
      href: `mailto:${SITE.email}`,
      external: false,
      icon: <Mail className="size-5" strokeWidth={1.5} />,
      name: "Email",
      value: SITE.email,
      ltr: true,
    },
  ];

  const ar = locale === "ar";
  const render = (c: (typeof cards)[number], index: number) => (
    <div
      key={c.name}
      className={`studio-channel ${index === 0 ? "studio-channel-featured" : ""}`}
      data-contact-reveal
    >
      <MagneticContactLink href={c.href} external={c.external}>
        <span className="studio-channel-symbol">{c.icon}</span>
        <span className="studio-channel-label">{c.name}</span>
        <strong dir="ltr">{c.value}</strong>
        <span className="studio-channel-invitation">
          {index === 0
            ? ar
              ? "نتحدث عن كل ما يهمك"
              : "A little question. A real conversation."
            : ar
              ? "نتواصل بطريقتك"
              : "On your terms."}
        </span>
      </MagneticContactLink>
      <div className="studio-channel-copy">
        <CopyButton value={c.value} label={ar ? "نسخ" : "Copy"} />
      </div>
    </div>
  );
  return (
    <section className="contact-direct-studio" aria-label={t("channelsTitle")}>
      <div className="studio-direct-intro" data-contact-reveal>
        <p className="eyebrow">{ar ? "تواصل مباشر" : "In good company"}</p>
        <h2>
          {ar
            ? `إنسان حقيقي.
على الطرف الآخر.`
            : `A human.
At the other end.`}
        </h2>
        <p>
          {ar
            ? "سؤال عابر أو فكرة كبيرة، يسعدنا أن نسمع منك."
            : "A passing thought or a big idea. We’d love to hear it."}
        </p>
        <a href="#correspondence" className="studio-text-link">
          {ar ? "أفضّل أن أكتب" : "I’d rather write"}
          <span>↓</span>
        </a>
        <div className="studio-connection-graphic" aria-hidden>
          <i />
          <i />
          <i />
          <span>M</span>
        </div>
      </div>
      <div className="studio-channel-layout">
        {render(cards[0], 0)}
        <div className="studio-channel-pairs">
          {cards.slice(1).map((c, index) => render(c, index + 1))}
        </div>
        <div className="studio-visit" data-contact-reveal>
          <MagneticContactLink href={ar ? "/ar/locate-us" : "/locate-us"}>
            <span className="studio-visit-map" aria-hidden>
              <MapPin size={25} strokeWidth={1} />
            </span>
            <span>
              <small>{t("channelVisit")}</small>
              <strong>
                {ar ? "تعال. واكتشف عطرك." : "Come in. Find your scent."}
              </strong>
              <span>{ar ? "ممرز سنتر · دبي" : "Mamzar Centre · Dubai"}</span>
            </span>
          </MagneticContactLink>
        </div>
      </div>
    </section>
  );
}
