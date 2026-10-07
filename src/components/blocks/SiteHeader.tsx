"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import gsap from "gsap";
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
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { getNavLeft, getNavRight, getShopMenu } from "@/lib/site";

type LinkKey = "about" | "shop" | "manufacture" | "contact";

const EASE = "expo.out";
const FLIGHT = 0.6;

export function SiteHeader({ locale }: { locale: Locale }) {
  // Compact flips once past 36px, releases below 18px — early
  // engagement so chrome and hero morph as one; hysteresis + cooldown
  // below mean no half-states and no oscillation.
  const t = useTranslations("Header");
  const tShop = useTranslations("ShopMenu");
  const router = useRouter();
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopEntered, setShopEntered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuEntered, setMenuEntered] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleLock = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useLayoutEffect(() => {
    const applyThresholds = (bypassLock: boolean) => {
      if (!bypassLock && Date.now() < toggleLock.current) return false;
      const y = window.scrollY;
      let flipped = false;
      setCompact((prev) => {
        if (!prev && y > 36) {
          toggleLock.current = Date.now() + 650;
          flipped = true;
          return true;
        }
        if (prev && y < 18) {
          toggleLock.current = Date.now() + 650;
          flipped = true;
          return false;
        }
        return prev;
      });
      return flipped;
    };
    const onScroll = () => {
      // Cooldown: once the navbar flips, it cannot flip back for 650ms.
      applyThresholds(false);
      setShopOpen(false);
      // Strict settle: 450ms after the last scroll event, re-sync the
      // state to the true scroll position (bypassing the lock). A stopped
      // scroll — even held halfway — always lands in exactly one state.
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => applyThresholds(true), 450);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  // GSAP FLIP: links fly between the stacked row and the side slots.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const keys: LinkKey[] = ["about", "shop", "manufacture", "contact"];
    const ctx = gsap.context(() => {
      for (const key of keys) {
        const stacked = stackedRefs.current[key];
        const inline = inlineRefs.current[key];
        if (!stacked || !inline) continue;
        if (compact) {
          const s = stacked.getBoundingClientRect();
          const t = inline.getBoundingClientRect();
          // Rounded to whole pixels — fractional transforms rasterize
          // text on subpixels and read as blurry/fuzzy.
          const dx = Math.round(s.left + s.width / 2 - (t.left + t.width / 2));
          const dy = Math.round(s.top + s.height / 2 - (t.top + t.height / 2));
          gsap.to(stacked, { opacity: 0, duration: 0.22, ease: "power2.out" });
          gsap.fromTo(
            inline,
            {
              x: dx,
              y: dy,
              opacity: 0,
              fontSize: "15px",
              letterSpacing: "0.24em",
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              fontSize: "12px",
              letterSpacing: "0.14em",
              duration: FLIGHT,
              ease: EASE,
              clearProps: "transform",
            }
          );
        } else {
          const s = inline.getBoundingClientRect();
          const t = stacked.getBoundingClientRect();
          const dx = Math.round(s.left + s.width / 2 - (t.left + t.width / 2));
          const dy = Math.round(s.top + s.height / 2 - (t.top + t.height / 2));
          gsap.to(inline, { opacity: 0, duration: 0.22, ease: "power2.out" });
          gsap.fromTo(
            stacked,
            {
              x: dx,
              y: dy,
              opacity: 0,
              fontSize: "12px",
              letterSpacing: "0.14em",
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              fontSize: "15px",
              letterSpacing: "0.24em",
              duration: FLIGHT,
              ease: EASE,
              clearProps: "transform",
            }
          );
        }
      }
    });
    return () => ctx.revert();
  }, [compact]);

  // Dropdown enter animation
  useLayoutEffect(() => {
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

  // Mobile menu choreography: staged enter, graceful exit with
  // delayed unmount so closing animates instead of vanishing.
  useLayoutEffect(() => {
    if (menuOpen) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setMenuEntered(true))
      );
      return () => {
        cancelAnimationFrame(id);
        setMenuEntered(false);
      };
    }
    setMenuEntered(false);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuEntered(false);
    setTimeout(() => setMenuOpen(false), 380);
  };

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

  const openShop = () => {
    cancelClose();
    const el = compact ? inlineRefs.current.shop : stackedRefs.current.shop;
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

  const pickLocale = (next: Locale) => {
    setLangOpen(false);
    if (next !== locale) router.replace(pathname, { locale: next });
  };

  const left = getNavLeft(locale);
  const right = getNavRight(locale);
  const shop = getShopMenu(locale);

  const linkFor = (key: LinkKey): string =>
    key === "about"
      ? left[0].href
      : key === "shop"
        ? left[1].href
        : key === "manufacture"
          ? right[0].href
          : right[1].href;
  const labelFor = (key: LinkKey): string =>
    key === "about"
      ? left[0].label
      : key === "shop"
        ? left[1].label
        : key === "manufacture"
          ? right[0].label
          : right[1].label;

  const stackedLink = (key: LinkKey) => (
    <Link
      key={key}
      ref={(el) => {
        stackedRefs.current[key] = el;
      }}
      href={linkFor(key)}
      onClick={() => setShopOpen(false)}
      onMouseEnter={() => key === "shop" && openShop()}
      onMouseLeave={() => key === "shop" && scheduleClose()}
      className="inline-flex items-center gap-1.5 text-[15px] font-bold tracking-[0.24em] text-ink antialiased transition-colors [text-rendering:optimizeLegibility] hover:text-gold"
    >
      {labelFor(key).toUpperCase()}
      {key === "shop" && <ChevronDown className="size-3.5 text-gold" />}
    </Link>
  );

  const inlineLink = (key: LinkKey) => (
    <Link
      key={key}
      ref={(el) => {
        inlineRefs.current[key] = el;
      }}
      href={linkFor(key)}
      onClick={() => setShopOpen(false)}
      onMouseEnter={() => key === "shop" && openShop()}
      onMouseLeave={() => key === "shop" && scheduleClose()}
      className="whitespace-nowrap text-[12px] font-bold tracking-[0.14em] text-ink antialiased opacity-0 transition-colors [text-rendering:optimizeLegibility] hover:text-gold"
    >
      {labelFor(key).toUpperCase()}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 [overflow-anchor:none]">
      {/* Background layers: soft gradient at top → light blur when compact.
          The gradient is viewport-anchored (.ivory-flow) so it continues
          seamlessly into the hero gutters below. */}
      <span
        aria-hidden
        className="ivory-flow pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ opacity: compact ? 0 : 1 }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cream/85 backdrop-blur-md transition-opacity duration-500"
        style={{ opacity: compact ? 1 : 0 }}
      />

      <div className="relative">
        {/* Main crest row */}
        <div
          className="mx-auto hidden max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid"
          style={{ height: compact ? 72 : 140 }}
        >
          <div className="flex items-center gap-1">
            <span className="relative">
              <button
                onClick={() => setLangOpen((v) => !v)}
                aria-label={t("language")}
                className="flex items-center gap-1.5 p-2 text-espresso transition hover:text-gold"
              >
                <Globe
                  className={`transition-all duration-500 ${compact ? "size-[15px]" : "size-5"}`}
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
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
                      {l === "en" ? t("english") : t("arabic")}
                    </button>
                  ))}
                </span>
              )}
            </span>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={t("search")}
              className="p-2 text-espresso transition hover:text-gold"
            >
              <Search
                className={`transition-all duration-500 ${compact ? "size-[15px]" : "size-5"}`}
              />
            </button>
            <span className={`flex items-center ${locale === "ar" ? "gap-7 pl-9" : "gap-6 pl-7"}`}>
              {inlineLink("about")}
              {inlineLink("shop")}
            </span>
          </div>

          <Link
            href="/"
            aria-label={t("home")}
            className="flex flex-col items-center justify-self-center py-1"
          >
            <Image
              src="/logo.webp"
              alt="Misk Al Ghazaal"
              width={176}
              height={176}
              priority
              className={`rounded-full object-cover transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                compact ? "size-14" : "size-[88px]"
              }`}
            />
            <span
              className="overflow-hidden text-[10px] font-semibold text-ink/70 transition-all duration-500"
              style={{
                maxHeight: compact ? 0 : 24,
                opacity: compact ? 0 : 1,
                letterSpacing: "0.42em",
                marginTop: compact ? 0 : 8,
                marginRight: "-0.42em",
              }}
            >
              MISK AL GHAZAAL
            </span>
          </Link>

          <div className="flex items-center justify-end gap-1">
            <span className={`flex items-center justify-end ${locale === "ar" ? "gap-7 pr-9" : "gap-6 pr-7"}`}>
              {inlineLink("manufacture")}
              {inlineLink("contact")}
            </span>
            <Link
              href="/account"
              aria-label={t("account")}
              className="p-2 text-espresso transition hover:text-gold"
            >
              <User
                className={`transition-all duration-500 ${compact ? "size-[15px]" : "size-5"}`}
              />
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              aria-label={t("bag")}
              className="relative p-2 text-espresso transition hover:text-gold"
            >
              <ShoppingBag
                className={`transition-all duration-500 ${compact ? "size-[15px]" : "size-5"}`}
              />
              <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white">
                2
              </span>
            </button>
          </div>
        </div>

        {/* Stacked nav — grid halves keep the divider exactly under the crest */}
        <nav
          aria-label="Primary"
          className="hidden overflow-hidden border-t border-ink/10 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block"
          style={{ maxHeight: compact ? 0 : 64, opacity: compact ? 0 : 1 }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-3.5 pb-5">
            <span className={`flex items-center justify-end ${locale === "ar" ? "gap-14 pr-12" : "gap-10 pr-8"}`}>
              {stackedLink("about")}
              {stackedLink("shop")}
            </span>
            <span aria-hidden className="h-[26px] w-px justify-self-center bg-gold-soft/90" />
            <span className={`flex items-center justify-start ${locale === "ar" ? "gap-14 pl-12" : "gap-10 pl-8"}`}>
              {stackedLink("manufacture")}
              {stackedLink("contact")}
            </span>
          </div>
        </nav>

        {/* Mobile bar */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t("openMenu")}
            className="justify-self-start p-2 text-ink"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" aria-label={t("home")} className="justify-self-center">
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
              aria-label={t("search")}
              className="p-2 text-espresso"
            >
              <Search className="size-5" />
            </button>
            <button
              onClick={() => setCartOpen(true)}
              aria-label={t("bag")}
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
                placeholder={t("searchPlaceholder")}
                autoFocus
                className="h-12 bg-white"
              />
              <Button type="submit" className="h-12">
                {t("search")}
              </Button>
            </form>
          </div>
        )}

        {/* Floating shop dropdown — measured from the trigger, never clips */}
        {shopOpen && anchor && (
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="fixed z-[70] max-h-[calc(100svh-120px)] w-[640px] max-w-[92vw] overflow-y-auto border border-ink/10 bg-[linear-gradient(180deg,rgba(255,253,249,0.94)_0%,rgba(250,247,241,0.92)_60%,rgba(242,236,221,0.9)_100%)] p-8 pt-7 shadow-[0_40px_80px_-28px_rgba(28,25,23,0.45)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              left: anchor.x,
              top: anchor.y,
              opacity: shopEntered ? 1 : 0,
              transform: `translateX(-50%) translateY(${shopEntered ? 0 : 14}px) scale(${shopEntered ? 1 : 0.97})`,
            }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold-soft to-transparent" />
            <p className="eyebrow mb-6 text-center text-gold">{tShop("title")}</p>
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

        {/* Mobile menu overlay — staged enter/exit, staggered rows */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-cream transition-opacity duration-300 lg:hidden"
            style={{ opacity: menuEntered ? 1 : 0 }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="flex items-center justify-between border-b border-ink/10 px-4 py-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                opacity: menuEntered ? 1 : 0,
                transform: `translateY(${menuEntered ? 0 : -12}px)`,
              }}
            >
              <Image
                src="/logo.webp"
                alt="Misk Al Ghazaal"
                width={44}
                height={44}
                className="rounded-full object-cover transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  opacity: menuEntered ? 1 : 0,
                  transform: `scale(${menuEntered ? 1 : 0.6}) rotate(${menuEntered ? 0 : -30}deg)`,
                }}
              />
              <button onClick={closeMenu} aria-label={t("closeMenu")} className="p-2 text-ink">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-6 py-6" aria-label="Mobile">
              {[
                <Link key="about" href={left[0].href} onClick={closeMenu} className="block py-3 font-display text-2xl text-ink">
                  {left[0].label}
                </Link>,
                <button
                  key="shop"
                  onClick={() => setMobileShopOpen((v) => !v)}
                  className="flex w-full items-center justify-between py-3 font-display text-2xl text-ink"
                >
                  {left[1].label}
                  <ChevronDown className={`size-5 transition ${mobileShopOpen ? "rotate-180" : ""}`} />
                </button>,
                ...right.map((l) => (
                  <Link key={l.href} href={l.href} onClick={closeMenu} className="block py-3 font-display text-2xl text-ink">
                    {l.label}
                  </Link>
                )),
              ].map((row, i) => (
                <span
                  key={i}
                  className="block transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    opacity: menuEntered ? 1 : 0,
                    transform: `translateY(${menuEntered ? 0 : 16}px)`,
                    transitionDelay: menuEntered ? `${120 + i * 60}ms` : "0ms",
                  }}
                >
                  {row}
                </span>
              ))}
              {mobileShopOpen && (
                <span className="block pb-2">
                  {shop.map((col) => (
                    <span key={col.heading} className="block py-2">
                      <Link href={col.href} onClick={closeMenu} className="font-display text-lg italic text-gold">
                        {col.heading}
                      </Link>
                      {col.links.map((l) =>
                        l.external ? (
                          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="block py-1.5 pl-3 text-sm text-espresso">
                            {l.label} ↗
                          </a>
                        ) : (
                          <Link key={l.href} href={l.href} onClick={closeMenu} className="block py-1.5 pl-3 text-sm text-espresso">
                            {l.label}
                          </Link>
                        )
                      )}
                    </span>
                  ))}
                </span>
              )}
              <span
                className="mt-6 flex gap-2 border-t border-ink/10 pt-6 transition-all duration-500"
                style={{
                  opacity: menuEntered ? 1 : 0,
                  transform: `translateY(${menuEntered ? 0 : 16}px)`,
                  transitionDelay: menuEntered ? "380ms" : "0ms",
                }}
              >
                {(["en", "ar"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => pickLocale(l)}
                    className={`border px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] ${
                      locale === l ? "border-ink bg-ink text-white" : "border-ink/20 text-espresso"
                    }`}
                  >
                    {l === "en" ? t("english") : t("arabic")}
                  </button>
                ))}
              </span>
              <Link href="/account" onClick={closeMenu} className="link-underline mt-6 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
                {t("loginAccount")}
              </Link>
            </nav>
          </div>
        )}

        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    </header>
  );
}
