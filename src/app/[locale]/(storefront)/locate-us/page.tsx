import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { SITE, L } from "@/lib/site";
import { pick, type Localizable } from "@/lib/i18n";
import { toLocale } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";

interface Card {
  icon: typeof MapPin;
  title: Localizable<string>;
  lines: Localizable<string>[];
}

const CARDS: Card[] = [
  {
    icon: MapPin,
    title: L("Visit Us", "زورونا"),
    lines: [
      SITE.address,
      L("Mamzar Centre, Ground Floor", "ممرز سنتر، الطابق الأرضي"),
    ],
  },
  {
    icon: Clock,
    title: L("Opening Hours", "ساعات العمل"),
    lines: [SITE.hours, L("Friday: 2PM–5PM", "الجمعة: 2–5 مساءً")],
  },
  {
    icon: Phone,
    title: L("Call Us", "اتصلوا بنا"),
    lines: [L(SITE.phone, SITE.phone), L("WhatsApp preferred", "يفضل واتساب")],
  },
  {
    icon: Mail,
    title: L("Write To Us", "راسلونا"),
    lines: [
      L(SITE.email, SITE.email),
      L("Replies within a day", "نرد خلال يوم"),
    ],
  },
];

export default async function LocateUsPage(
  props: PageProps<"/[locale]/locate-us">,
) {
  const { locale: raw } = await props.params;
  const locale: Locale = toLocale(raw);
  setRequestLocale(locale);

  const title = pick(L("Find Us!", "جدوا الدار"), locale);
  const sub = pick(
    L(
      "Our doors in Dubai are open — come smell the collection before you choose.",
      "أبوابنا في دبي مفتوحة — تعالوا وشمّوا التشكيلة قبل أن تختاروا.",
    ),
    locale,
  );
  const directions = pick(L("Get Directions", "احصلوا على الاتجاهات"), locale);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    "Mamzar Centre Dubai UAE",
  )}`;

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      {/* Editorial Header */}
      <div className="flex flex-col items-center text-center">
        <p className="eyebrow flex items-center gap-3 tracking-[0.3em] text-gold">
          <span className="h-px w-8 bg-gold/50" />
          {pick(L("Locate Us", "موقعنا"), locale)}
          <span className="h-px w-8 bg-gold/50" />
        </p>
        <h1 className="mt-6 max-w-2xl font-display text-4xl leading-tight text-ink md:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-espresso md:text-base">
          {sub}
        </p>
      </div>

      {/* Main Content Split */}
      <div className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Details List */}
        <section className="lg:col-span-5 lg:pr-8">
          <div className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
            {CARDS.map((c) => (
              <div
                key={pick(c.title, locale)}
                className="group flex items-start gap-6 py-8 transition-colors hover:bg-ink/[0.02]"
              >
                <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 text-gold transition-transform group-hover:scale-110">
                  <c.icon className="size-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-display text-xl text-ink md:text-2xl">
                    {pick(c.title, locale)}
                  </h2>
                  <div className="mt-3 space-y-1">
                    {c.lines.map((ln, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-espresso"
                      >
                        {pick(ln, locale)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-ink px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition-all hover:bg-gold-soft hover:text-ink"
            >
              <Navigation className="size-4" />
              {directions}
            </a>
            <Link
              href="/pages/contact"
              className="group inline-flex items-center text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
            >
              <span className="border-b border-ink/30 pb-1 transition-colors group-hover:border-ink">
                {pick(L("Or send a message", "أو راسلونا برسالة"), locale)}
              </span>
            </Link>
          </div>
        </section>

        {/* Right Column: Framed Map */}
        <section className="lg:col-span-7">
          <div className="relative w-full overflow-hidden bg-ink/5 p-2 lg:p-3">
            {/* Inner Frame */}
            <div className="relative h-[400px] w-full overflow-hidden border border-ink/10 md:h-[600px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3297.6741687331523!2d55.35122417498967!3d25.280274877657593!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5dcff4856503%3A0xcdb6ec6f63a1c3d!2sMisk%20Al%20Gazaal%20Perfumes!5e1!3m2!1sen!2sae!4v1791444224138!5m2!1sen!2sae"
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 size-full border-0 transition-all duration-1000 ease-in-out filter grayscale hover:grayscale-0"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
