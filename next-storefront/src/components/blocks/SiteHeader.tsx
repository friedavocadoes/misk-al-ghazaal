"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronDown,
  Globe,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartDrawer } from "./CartDrawer";
import { SITE, getNavLeft, getNavRight, getShopMenu } from "@/lib/site";

const SCROLL_RANGE = 140;

type LinkKey = "about" | "shop" | "manufacture" | "contact";

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function SiteHeader() {
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopEntered, setShopEntered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const raf = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stackedRefs = useRef<Record<LinkKey, HTMLElement | null>>({
    about: null,
    shop: null,
    manufacture: null,
    contact: null,
  });
  const inlineRefs = useRef<Record<LinkKey, HTMLElement | null>>({
    about: null,
    shop: null,
    manufacture: null,
    contact: null,
  });

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("locale")
        : null;
    if (saved === "ar" || saved === "en") {
      setLocale(saved);
      document.documentElement.lang = saved === "ar" ? "ar" : "en";
    }
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, SCROLL_RANGE);
        setProgress(y / SCROLL_RANGE);
        setShopOpen(false);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  // FLIP: each link physically travels from the stacked row to its side slot,
  // scrubbed by scroll progress, snapping into place at the ends.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const k =
      progress <= 0.02 ? 0 : progress >= 0.97 ? 1 : easeInOut(progress);
    const keys: LinkKey[] = ["about", "shop", "manufacture", "contact"];
    for (const key of keys) {
      const from = stackedRefs.current[key];
      const to = inlineRefs.current[key];
      if (!from || !to) continue;
      const s = from.getBoundingClientRect();
      const t = to.getBoundingClientRect();
      const dx = s.left + s.width / 2 - (t.left + t.width / 2);
      const dy = s.top + s.height / 2 - (t.top + t.height / 2);
      const travel = 1 - k;
      to.style.transform = `translate(${dx * travel}px, ${dy * travel}px)`;
      to.style.opacity = progress <= 0.02 ? "0" : String(Math.min(1, Math.max(0, (progress - 0.12) / 0.5)));
      to.style.fontSize = `${15 - 3 * k}px`;
      to.style.letterSpacing = `${0.24 - 0.1 * k}em`;
      from.style.opacity = String(Math.max(0, 1 - progress * 2.2));
    }
  }, [progress]);

  // Dropdown enter animation
  useEffect(() => {
    if (shopOpen) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setShopEntered(true))
      );
      return () => {
        cancelAnimationFrame(id);
        setShopEntered(false);
      };
    }
    setShopEntered(false);
  }, [shopOpen]);

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setShopOpen(false), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openShop = (key: LinkKey) => {
    cancelClose();
    const el =
      key === "shop"
        ? progress > 0.5
          ? inlineRefs.current.shop
          : stackedRefs.current.shop
        : null;
    if (el) {
      const r = el.getBoundingClientRect();
      const cx = Math.min(
        Math.max(r.left + r.width / 2, 340),
        window.innerWidth - 340
      );
      setAnchor({ x: cx, y: r.bottom + 10 });
    }
    setShopOpen(true);
  };

  const pickLocale = (next: "en" | "ar") => {
    setLocale(next);
    window.localStorage.setItem("locale", next);
    document.documentElement.lang = next === "ar" ? "ar" : "en";
    setLangOpen(false);
  };

  const left = getNavLeft();
  const right = getNavRight();
  const shop = getShopMenu();

  const logoSize = Math.round(88 - 46 * progress);
  const iconSize = Math.round(20 - 5 * progress);
  const rowH = Math.round(104 - 36 * progress);
  const stackedFS = 15 - 2 * progress;
  const stackedLS = 0.24 - 0.1 * progress;
  const linkFor = (key: LinkKey): string =>
    key === "about"
      ? left[0].href
      : key === "shop"
        ? left[1].href
        : key === "manufacture"
          ? right[0].href
          : right[1].href;

  const stackedLink = (key: LinkKey, label: string) => (
    <Link
      key={key}
      ref={(el) => {
        stackedRefs.current[key] = el;
      }}
      href={linkFor(key)}
      onClick={() => setShopOpen(false)}
      onMouseEnter={() => key === "shop" && openShop(key)}
      onMouseLeave={() => key === "shop" && scheduleClose()}
      className="inline-flex items-center gap-1.5 font-bold text-ink transition-colors hover:text-gold"
      style={{ fontSize: `${stackedFS}px`, letterSpacing: `${stackedLS}em` }}
    >
      {label.toUpperCase()}
      {key === "shop" && <ChevronDown className="size-3.5 text-gold" />}
    </Link>
  );

  const inlineLink = (key: LinkKey, label: string) => (
    <Link
      key={key}
      ref={(el) => {
        inlineRefs.current[key] = el;
      }}
      href={linkFor(key)}
      onClick={() => setShopOpen(false)}
      onMouseEnter={() => key === "shop" && openShop(key)}
      onMouseLeave={() => key === "shop" && scheduleClose()}
      className="whitespace-nowrap font-bold text-ink transition-colors hover:text-gold"
    >
      {label.toUpperCase()}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/95 backdrop-blur-md">
      {/* Announcement — collapses on scroll */}
      <div
        className="overflow-hidden bg-ink"
        style={{ maxHeight: `${(1 - progress) * 40}px`, opacity: 1 - progress }}
      >
        <p className="whitespace-nowrap px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
          {SITE.announcement}
        </p>
      </div>

      {/* Main crest row */}
      <div
        className="mx-auto hidden max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 lg:grid"
        style={{ height: `${rowH + 16}px` }}
      >
        <div className="flex items-center gap-1">
          <span className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              aria-label="Language"
              className="flex items-center gap-1.5 p-2 text-espresso transition hover:text-gold"
            >
              <Globe style={{ width: iconSize, height: iconSize }} />
              <span
                className="font-semibold uppercase"
                style={{ fontSize: "11px", letterSpacing: "0.14em" }}
              >
                {locale}
              </span>
            </button>
            {langOpen && (
              <span className="absolute left-0 top-full z-50 border border-ink/10 bg-white py-1 shadow-lg">
                {(["en", "ar"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => pickLocale(l)}
                    className={`block w-full px-5 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.14em] transition hover:bg-sand ${
                      locale === l ? "text-gold" : "text-espresso"
                    }`}
                  >
                    {l === "en" ? "English" : "العربية"}
                  </button>
                ))}
              </span>
            )}
          </span>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="p-2 text-espresso transition hover:text-gold"
          >
            <Search style={{ width: iconSize, height: iconSize }} />
          </button>
          <span
            className="flex items-center gap-5 overflow-hidden pl-3"
            style={{ maxWidth: `${progress * 300}px` }}
          >
            {inlineLink("about", left[0].label)}
            {inlineLink("shop", left[1].label)}
          </span>
        </div>

        <Link
          href="/"
          aria-label="Misk Al Ghazaal home"
          className="justify-self-center py-1"
        >
          <Image
            src="/logo.webp"
            alt="Misk Al Ghazaal"
            width={176}
            height={176}
            priority
            className="rounded-full object-cover"
            style={{ width: logoSize, height: logoSize }}
          />
        </Link>

        <div className="flex items-center justify-end gap-1">
          <span
            className="flex items-center justify-end gap-5 overflow-hidden pr-3"
            style={{ maxWidth: `${progress * 340}px` }}
          >
            {inlineLink("manufacture", right[0].label)}
            {inlineLink("contact", right[1].label)}
          </span>
          <Link
            href="/account"
            aria-label="Account"
            className="p-2 text-espresso transition hover:text-gold"
          >
            <User style={{ width: iconSize, height: iconSize }} />
          </Link>
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Open bag"
            className="relative p-2 text-espresso transition hover:text-gold"
          >
            <ShoppingBag style={{ width: iconSize, height: iconSize }} />
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white">
              2
            </span>
          </button>
        </div>
      </div>

      {/* Stacked nav — grid halves keep the divider exactly under the crest */}
      <nav
        aria-label="Primary"
        className="hidden overflow-hidden lg:block"
        style={{ maxHeight: `${(1 - progress) * 64}px`, opacity: 1 - progress }}
      >
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-center pb-4"
          style={{ transform: `translateY(${progress * -8}px)` }}
        >
          <span className="flex items-center justify-end gap-10 pr-8">
            {stackedLink("about", left[0].label)}
            {stackedLink("shop", left[1].label)}
          </span>
          <span
            aria-hidden
            className="w-px justify-self-center bg-gold-soft"
            style={{ height: `${30 - 10 * progress}px`, opacity: 0.9 }}
          />
          <span className="flex items-center justify-start gap-10 pl-8">
            {stackedLink("manufacture", right[0].label)}
            {stackedLink("contact", right[1].label)}
          </span>
        </div>
      </nav>

      {/* Mobile bar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2 lg:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="justify-self-start p-2 text-ink"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/" aria-label="Misk Al Ghazaal home" className="justify-self-center">
          <Image
            src="/logo.webp"
            alt="Misk Al Ghazaal"
            width={96}
            height={96}
            priority
            className="rounded-full object-cover"
            style={{ width: 52, height: 52 }}
          />
        </Link>
        <span className="flex items-center justify-end">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="p-2 text-espresso"
          >
            <Search className="size-5" />
          </button>
          <button
            onClick={() => setCartOpen(true)}
            aria-label="Open bag"
            className="relative p-2 text-espresso"
          >
            <ShoppingBag className="size-5" />
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white">
              2
            </span>
          </button>
        </span>
      </div>

      {/* Search drawer row */}
      {searchOpen && (
        <div className="border-t border-ink/10 bg-cream px-5 py-4">
          <form action="/search" method="get" className="mx-auto flex max-w-2xl gap-2">
            <Input
              name="q"
              placeholder="Search perfumes, bakhoor, oudh…"
              autoFocus
              className="h-12 bg-white"
            />
            <Button type="submit" className="h-12">
              Search
            </Button>
          </form>
        </div>
      )}

      {/* Floating shop dropdown — lives outside the collapsing nav, measured
          from the Shop trigger so it never clips */}
      {shopOpen && anchor && (
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="fixed z-[70] w-[640px] max-w-[92vw] -translate-x-1/2 border border-ink/10 bg-white p-8 shadow-[0_40px_80px_-28px_rgba(28,25,23,0.45)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            left: anchor.x,
            top: anchor.y,
            opacity: shopEntered ? 1 : 0,
            transform: `translateX(-50%) translateY(${shopEntered ? 0 : 14}px) scale(${shopEntered ? 1 : 0.97})`,
          }}
        >
          <div className="grid grid-cols-3 gap-8">
            {shop.map((col, ci) => (
              <div
                key={col.heading}
                className="transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  opacity: shopEntered ? 1 : 0,
                  transform: `translateY(${shopEntered ? 0 : 10}px)`,
                  transitionDelay: shopEntered ? `${80 + ci * 70}ms` : "0ms",
                }}
              >
                <Link
                  href={col.href}
                  onClick={() => setShopOpen(false)}
                  className="font-display text-lg italic text-ink transition hover:text-gold"
                >
                  {col.heading}
                </Link>
                <span className="mt-2.5 block h-px w-9 bg-gold-soft" />
                <ul className="mt-3.5 space-y-2.5">
                  {col.links.map((l) =>
                    l.external ? (
                      <li key={l.href}>
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[13px] text-espresso transition hover:text-gold"
                        >
                          {l.label}
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      </li>
                    ) : (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          onClick={() => setShopOpen(false)}
                          className="text-[13px] text-espresso transition hover:text-gold"
                        >
                          {l.label}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-cream lg:hidden" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <Image src="/logo.webp" alt="Misk Al Ghazaal" width={44} height={44} className="rounded-full object-cover" />
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="p-2 text-ink">
              <X className="size-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-6 py-6" aria-label="Mobile">
            <Link href={left[0].href} onClick={() => setMenuOpen(false)} className="block py-3 font-display text-2xl text-ink">
              {left[0].label}
            </Link>
            <button
              onClick={() => setMobileShopOpen((v) => !v)}
              className="flex w-full items-center justify-between py-3 font-display text-2xl text-ink"
            >
              Shop
              <ChevronDown className={`size-5 transition ${mobileShopOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileShopOpen && (
              <span className="block pb-2">
                {shop.map((col) => (
                  <span key={col.heading} className="block py-2">
                    <Link href={col.href} onClick={() => setMenuOpen(false)} className="font-display text-lg italic text-gold">
                      {col.heading}
                    </Link>
                    {col.links.map((l) =>
                      l.external ? (
                        <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="block py-1.5 pl-3 text-sm text-espresso">
                          {l.label} ↗
                        </a>
                      ) : (
                        <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-1.5 pl-3 text-sm text-espresso">
                          {l.label}
                        </Link>
                      )
                    )}
                  </span>
                ))}
              </span>
            )}
            {right.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-3 font-display text-2xl text-ink">
                {l.label}
              </Link>
            ))}
            <span className="mt-6 flex gap-2 border-t border-ink/10 pt-6">
              {(["en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => pickLocale(l)}
                  className={`border px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] ${
                    locale === l ? "border-ink bg-ink text-white" : "border-ink/20 text-espresso"
                  }`}
                >
                  {l === "en" ? "English" : "العربية"}
                </button>
              ))}
            </span>
            <Link href="/account" onClick={() => setMenuOpen(false)} className="link-underline mt-6 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
              Login / Account
            </Link>
          </nav>
        </div>
      )}

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
