import Link from "next/link";
import { Button } from "@/components/ui/button";

const SLIDES = [
  {
    eyebrow: "Direct from manufacturer",
    title: "Misk Al Ghazaal",
    desc: "Get Misk Al Ghazaal products direct from the manufacturer.",
    cta: "Shop Now",
    href: "/collections/misk-al-ghazaal",
    image: "https://picsum.photos/seed/gazaal-hero1/1600/700",
    theme: "light" as const,
  },
  {
    eyebrow: "Timeless elegance",
    title: "Noorjes Perfumes",
    desc: "Experience the luxurious fragrances of Noorjes.",
    cta: "Buy Now",
    href: "/product/noorjes-imagine",
    image: "https://picsum.photos/seed/gazaal-hero2/1600/700",
    theme: "light" as const,
  },
  {
    eyebrow: "Dhukhoon",
    title: "Big Boss",
    desc: "Spicy agarwood and sweet amber — a profound start.",
    cta: "Buy Now",
    href: "/product/big-boss-dhukhoon",
    image: "https://picsum.photos/seed/gazaal-hero3/1600/700",
    theme: "light" as const,
  },
];

export function HeroCarousel() {
  const slide = SLIDES[0];
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-emerald-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.image}
          alt={slide.title}
          className="h-[320px] w-full object-cover opacity-70 md:h-[420px]"
        />
        <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
            {slide.eyebrow}
          </p>
          <h1 className="mt-2 max-w-md text-4xl font-bold text-white md:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-3 max-w-md text-sm text-emerald-50/90 md:text-base">
            {slide.desc}
          </p>
          <div className="mt-6">
            <Button asChild variant="gold" size="lg">
              <Link href={slide.href}>{slide.cta}</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {SLIDES.slice(1).map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className="group relative overflow-hidden rounded-3xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image}
              alt={s.title}
              className="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="absolute bottom-0 p-6">
              <span className="block text-xs font-semibold uppercase tracking-widest text-emerald-200">
                {s.eyebrow}
              </span>
              <span className="block text-2xl font-bold text-white">{s.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
