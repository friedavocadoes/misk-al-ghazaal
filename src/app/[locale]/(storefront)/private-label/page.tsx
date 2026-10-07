import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

const PROCESS = [
  {
    n: "01",
    title: "Consultation",
    text: "Share your vision — scent family, market, price tier. Our perfumers translate it into a technical brief.",
  },
  {
    n: "02",
    title: "Sampling",
    text: "Receive lab samples within 10–14 days. We revise together until the juice is unmistakably yours.",
  },
  {
    n: "03",
    title: "Production",
    text: "Maceration, filling, crimping and finishing under one roof, batch-tested for stability and projection.",
  },
  {
    n: "04",
    title: "Delivery",
    text: "White-label or fully branded, packed and shipped across the UAE and GCC with export documentation.",
  },
];

const CAPABILITIES = [
  { title: "Eau de Parfum & EDT", text: "15–120ml flacons, 18–25% parfum concentration." },
  { title: "Attars & Misk", text: "Alcohol-free oils in 3–12ml crystal and roll-on formats." },
  { title: "Bakhoor & Dukhoon", text: "Tablets, muattar and maamoul in your scent signature." },
  { title: "Mubakhar & Oudh", text: "Graded chips and dehn al oud for prestige lines." },
  { title: "Home Ritual", text: "Room sprays, car scents and mabkhara pairings." },
  { title: "Full Branding", text: "Bottle sourcing, cartons, cellophane and barcoding." },
];

const GALLERY = [
  "/products/abukhalid-1.jpg",
  "/products/classic-oud-1.jpg",
  "/products/noorjes-imagine-1.jpg",
  "/products/misk-al-ghazaal-abukhalid-50ml-1.jpg",
];

export default async function PrivateLabelPage(
  props: PageProps<"/[locale]/private-label">
) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <span className="absolute inset-0">
          <Image
            src="/products/amber-wood-1.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-30"
            priority
          />
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <p className="eyebrow flex items-center gap-3 text-gold-soft">
            <span className="inline-block h-px w-10 bg-gold-soft" />
            Private Label & Contract Manufacturing
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.04] md:text-7xl">
            Your scent, crafted at origin.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/80">
            Misk Al Ghazaal is a working perfume manufactory — the same house
            behind our maison line produces white-label attars, bakhoor and
            eau de parfum for boutiques, hotels and retailers who need it.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-7">
            <Link
              href="/pages/contact?topic=meeting"
              className="bg-white px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-gold-wash"
            >
              Request a Meeting
            </Link>
            <Link
              href="/collection/best-sellers"
              className="link-underline text-[12px] font-semibold uppercase tracking-[0.2em] text-white/85"
            >
              Browse the Maison Line
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-ink/10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-ink/10 px-5 md:grid-cols-4 md:px-8">
          {[
            ["500+", "Unit minimum order"],
            ["40+", "In-house formulas"],
            ["14 days", "First samples"],
            ["UAE + GCC", "Export ready"],
          ].map(([v, l]) => (
            <div key={l} className="px-5 py-8 text-center">
              <p className="font-display text-3xl text-ink md:text-4xl">{v}</p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
                {l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <p className="eyebrow text-gold">How It Works</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl text-ink md:text-4xl">
          From brief to bottle in four movements
        </h2>
        <div className="mt-10 border-t border-ink/10">
          {PROCESS.map((s) => (
            <div
              key={s.n}
              className="grid gap-2 border-b border-ink/10 py-7 md:grid-cols-[80px_220px_1fr] md:gap-8"
            >
              <span className="font-display text-lg italic text-gold">{s.n}</span>
              <h3 className="font-display text-2xl text-ink">{s.title}</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-espresso">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-y border-ink/10 bg-sand/50">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <p className="eyebrow text-gold">Capabilities</p>
          <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
            What the house can make for you
          </h2>
          <div className="mt-10 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="bg-cream p-7">
                <h3 className="font-display text-xl text-ink">{c.title}</h3>
                <span className="mt-3 block h-px w-9 bg-gold-soft" />
                <p className="mt-3 text-sm leading-relaxed text-espresso">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <p className="eyebrow text-gold">From the Lab Shelves</p>
        <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
          Flacons, oils & incense we bottle daily
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-1 md:grid-cols-4">
          {GALLERY.map((src) => (
            <span key={src} className="relative block aspect-[3/4] overflow-hidden bg-sand">
              <Image
                src={src}
                alt="Misk Al Ghazaal production"
                fill
                sizes="(min-width:768px) 25vw, 50vw"
                className="object-cover"
              />
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center md:px-8 md:py-20">
          <p className="eyebrow text-gold-soft">Begin</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl text-white md:text-5xl">
            Tell us what you want the world to smell.
          </h2>
          <Link
            href="/pages/contact?topic=meeting"
            className="mt-8 inline-block bg-white px-10 py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-gold-wash"
          >
            Request a Meeting
          </Link>
        </div>
      </section>
    </div>
  );
}
