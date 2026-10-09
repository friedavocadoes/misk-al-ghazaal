"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import gsap from "gsap";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Crown,
  Flame,
  Globe,
  Heart,
  LogOut,
  MapPin,
  Mars,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  User,
  Venus,
  X,
} from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { ShopperAvatar } from "@/components/ui/avatar";
import { GoogleGlyph } from "@/components/ui/brand-icons";
import { avatarOf, displayNameOf, providerOf } from "@/lib/shopper-identity";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { getNavLeft, getNavRight, getShopMenu } from "@/lib/site";
import type { ShopMenuIcon } from "@/lib/site";
import { useCart } from "@/lib/cart";

const MENU_ICONS: Record<ShopMenuIcon, typeof Star> = {
  mars: Mars,
  venus: Venus,
  flame: Flame,
  sparkles: Sparkles,
  star: Star,
  crown: Crown,
  arrow: ArrowUpRight,
};

type LinkKey = "about" | "shop" | "manufacture" | "contact";

const EASE = "expo.out";
const FLIGHT = 0.6;

export function SiteHeader({ locale }: { locale: Locale }) {
  // Compact flips once past 36px, releases below 18px — early
  // engagement so chrome and hero morph as one; hysteresis + cooldown
  // below mean no half-states and no oscillation.
  const t = useTranslations("Header");
  const tShop = useTranslations("ShopMenu");
  const tAcc = useTranslations("Account");
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
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [shopper, setShopper] = useState<{
    name: string;
    email: string;
    avatar: string | null;
    provider: "google" | "email";
  } | null>(null);
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
              fontSize: "13px",
              letterSpacing: "0.22em",
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              fontSize: "11px",
              letterSpacing: "0.12em",
              duration: FLIGHT,
              ease: EASE,
              clearProps: "transform",
            },
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
              fontSize: "11px",
              letterSpacing: "0.12em",
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              fontSize: "13px",
              letterSpacing: "0.22em",
              duration: FLIGHT,
              ease: EASE,
              clearProps: "transform",
            },
          );
        }
      }
    });
    return () => ctx.revert();
  }, [compact]);

  // Search panel niceties: Escape closes it.
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  // Shopper session: re-syncs on every navigation (login redirects land
  // back here) plus live auth events. No setState-in-effect: subscription
  // callbacks own all updates.
  useEffect(() => {
    const sb = createBrowserClient();
    const apply = (u: { email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null) => {
      if (!u?.email) {
        setShopper(null);
        return;
      }
      setShopper({
        name: displayNameOf(u),
        email: u.email,
        avatar: avatarOf(u),
        provider: providerOf(u),
      });
    };
    let live = true;
    sb.auth.getUser().then(({ data }) => {
      if (live) apply(data.user);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname]);

  const signOut = async () => {
    setAccountOpen(false);
    closeMenu();
    await createBrowserClient().auth.signOut();
    setShopper(null);
    router.refresh();
  };

  // Account dropdown: hover-intent like the shop menu (touch keeps the
  // click toggle). Enter choreography is a mount keyframe (no effects);
  // the close delay lets the cursor travel into the panel.
  const accountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openAccount = () => {
    if (accountTimer.current) {
      clearTimeout(accountTimer.current);
      accountTimer.current = null;
    }
    setAccountOpen(true);
  };
  const scheduleAccountClose = () => {
    if (accountTimer.current) clearTimeout(accountTimer.current);
    accountTimer.current = setTimeout(() => setAccountOpen(false), 140);
  };

  // Dropdown enter animation
  useLayoutEffect(() => {
    if (shopOpen) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setShopEntered(true)),
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
        requestAnimationFrame(() => setMenuEntered(true)),
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
        window.innerWidth - 340,
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
  const { count: bagCount } = useCart();

  // Icon glyphs scale on the GPU (transform) inside fixed-size hit areas,
  // so shrinking the chrome never reflows the flex rows mid-flight — the
  // GSAP FLIP targets stay exactly where they were measured.
  const glyph = `size-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
    compact ? "scale-[0.75]" : "scale-100"
  }`;

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

  // Maison nav voice: quiet Inter small-caps (letterspaced, medium) —
  // the serif belongs to headlines, not the chrome. Stacked and inline
  // share the family; only size/weight/tracking morph in the flight.
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
      tabIndex={compact ? -1 : 0}
      aria-hidden={compact}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.22em] text-ink antialiased transition-colors hover:text-gold"
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
      tabIndex={compact ? 0 : -1}
      aria-hidden={!compact}
      className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-ink antialiased opacity-0 transition-colors hover:text-gold"
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
        {/* Main crest row — slimmer now that the wordmark sits in the page, not the bar */}
        <div
          className="mx-auto hidden max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid"
          style={{ height: compact ? 72 : 108 }}
        >
          <div className="flex items-center">
            <span className="relative flex h-9 items-center">
              <button
                onClick={() => setLangOpen((v) => !v)}
                aria-label={t("language")}
                className="flex h-9 items-center gap-1.5 px-2 text-espresso transition hover:text-gold cursor-pointer"
              >
                <Globe className={glyph} />
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
                      className={`block w-full cursor-pointer px-5 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.14em] transition hover:bg-sand ${
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
              aria-expanded={searchOpen}
              className="flex size-9 shrink-0 items-center justify-center text-espresso transition hover:text-gold cursor-pointer"
            >
              <Search className={glyph} />
            </button>
            <span
              className={`flex items-center ${locale === "ar" ? "gap-7 pl-9" : "gap-6 pl-7"}`}
            >
              {inlineLink("about")}
              {inlineLink("shop")}
            </span>
          </div>

          <Link
            href="/"
            aria-label={t("home")}
            className="group flex items-center justify-center justify-self-center py-1"
          >
            {/* Fixed-size artwork, GPU-scaled to fit the shrinking frame:
                the pixels interpolate smoothly instead of reflowing, so the
                crest glides 88 → 64 with no shrink-then-grow hitch. */}
            <span
              className={`flex items-center justify-center transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-[1px] ${
                compact ? "size-16" : "size-[88px]"
              }`}
            >
              <Image
                src="/logo.webp"
                alt="Misk Al Ghazaal"
                width={176}
                height={176}
                priority
                className={`h-[88px] w-[88px] object-contain transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:drop-shadow-[0_12px_16px_rgba(0,0,0,0.06)] ${
                  compact ? "scale-[0.727]" : "scale-100"
                }`}
              />
            </span>
          </Link>

          <div className="flex items-center justify-end">
            <span
              className={`flex items-center justify-end ${locale === "ar" ? "gap-7 pr-9" : "gap-6 pr-7"}`}
            >
              {inlineLink("manufacture")}
              {inlineLink("contact")}
            </span>
            <Link
              href="/locate-us"
              aria-label={t("locateUs")}
              className="flex h-9 items-center gap-1.5 px-2 text-espresso transition hover:text-gold"
            >
              <MapPin className={`${glyph} shrink-0`} />
              {!compact && (
                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {t("locateUs")}
                </span>
              )}
            </Link>
            {shopper ? (
              <span
                className="relative"
                onMouseEnter={openAccount}
                onMouseLeave={scheduleAccountClose}
              >
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-expanded={accountOpen}
                  aria-label={t("myAccount")}
                  className="flex h-9 cursor-pointer items-center gap-1.5 px-2 text-espresso transition hover:text-gold"
                >
                  {shopper.avatar ? (
                    <ShopperAvatar url={shopper.avatar} name={shopper.name} className="size-6" />
                  ) : (
                    <User className={`${glyph} shrink-0`} />
                  )}
                  {!compact && (
                    <span className="max-w-[120px] truncate whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em]">
                      {shopper.name}
                    </span>
                  )}
                  <ChevronDown
                    className={`size-3 shrink-0 text-gold transition-transform ${accountOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {accountOpen && (
                  <span
                    onMouseEnter={openAccount}
                    onMouseLeave={scheduleAccountClose}
                    className="absolute end-0 top-full z-50 w-64 origin-top border border-ink/10 bg-white py-2 shadow-[0_24px_48px_-20px_rgba(28,25,23,0.4)] animate-[account-in_0.32s_cubic-bezier(0.22,1,0.36,1)]"
                  >
                    {/* Identity header */}
                    <span className="flex items-center gap-3 border-b border-ink/10 px-5 pb-3 pt-1">
                      <ShopperAvatar url={shopper.avatar} name={shopper.name} className="size-10 shrink-0" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {shopper.name}
                        </span>
                        <span className="block truncate text-[12px] text-fog" dir="ltr">
                          {shopper.email}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-fog/80">
                          {tAcc("loggedInWith")}{" "}
                          {shopper.provider === "google" ? (
                            <GoogleGlyph className="inline size-3 align-[-1px]" />
                          ) : (
                            tAcc("providerEmail")
                          )}
                        </span>
                      </span>
                    </span>
                    {(
                      [
                        { href: "/account", label: t("myAccount"), Icon: User },
                        { href: "/account/orders", label: t("myOrders"), Icon: Package },
                        { href: "/account/coupons", label: t("myRewards"), Icon: Ticket },
                        { href: "/account/wishlist", label: tAcc("wishlistTitle"), Icon: Heart },
                      ] as const
                    ).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-3 px-5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso transition hover:bg-sand hover:text-gold"
                      >
                        <l.Icon className="size-4 shrink-0 text-gold/80" />
                        {l.label}
                      </Link>
                    ))}
                    <button
                      onClick={signOut}
                      className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-espresso transition hover:bg-[#9c2b2e] hover:text-white"
                    >
                      <LogOut className="size-4 shrink-0" />
                      {t("signOut")}
                    </button>
                  </span>
                )}
              </span>
            ) : (
              <Link
                href="/account"
                aria-label={t("account")}
                className="flex h-9 items-center gap-1.5 px-2 text-espresso transition hover:text-gold"
              >
                <User className={`${glyph} shrink-0`} />
                {!compact && (
                  <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em]">
                    {t("loginSignup")}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setCartOpen(true)}
              aria-label={t("bag")}
              className="relative flex size-9 cursor-pointer items-center justify-center text-espresso transition hover:text-gold"
            >
              <ShoppingBag className={glyph} />
              {bagCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white">
                  {bagCount > 99 ? "99" : bagCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stacked nav — grid halves keep the divider exactly under the crest */}
        <nav
          aria-label="Primary"
          className="hidden overflow-hidden border-t border-ink/10 transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block"
          style={{ maxHeight: compact ? 0 : 64, opacity: compact ? 0 : 1 }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-3.5 pb-5">
            <span
              className={`flex items-center justify-end ${locale === "ar" ? "gap-14 pr-12" : "gap-10 pr-8"}`}
            >
              {stackedLink("about")}
              {stackedLink("shop")}
            </span>
            <span
              aria-hidden
              className="h-[26px] w-px justify-self-center bg-gold-soft/90"
            />
            <span
              className={`flex items-center justify-start ${locale === "ar" ? "gap-14 pl-12" : "gap-10 pl-8"}`}
            >
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
            className="cursor-pointer justify-self-start p-2 text-ink"
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
              className="cursor-pointer p-2 text-espresso"
            >
              <Search className="size-5" />
            </button>
            <button
              onClick={() => setCartOpen(true)}
              aria-label={t("bag")}
              className="relative cursor-pointer p-2 text-espresso"
            >
              <ShoppingBag className="size-5" />
              {bagCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white">
                  {bagCount > 99 ? "99" : bagCount}
                </span>
              )}
            </button>
          </span>
        </div>

        {/* Search panel — a single underline, no boxes. The gold rule draws
            itself on focus; the serif italic field keeps it maison. */}
        {searchOpen && (
          <div className="relative border-t border-ink/10 bg-cream/95 backdrop-blur-md">
            <button
              onClick={() => setSearchOpen(false)}
              aria-label={t("closeSearch")}
              className="absolute end-4 top-4 flex size-9 cursor-pointer items-center justify-center text-fog transition hover:text-ink"
            >
              <X className="size-4" />
            </button>
            <div className="mx-auto max-w-2xl px-5 pb-9 pt-8 text-center md:pb-11">
              <p className="eyebrow flex items-center justify-center gap-3 text-gold">
                <span className="h-px w-8 bg-gold/50" />
                {t("searchTitle")}
                <span className="h-px w-8 bg-gold/50" />
              </p>
              <form
                action={locale === "ar" ? "/ar/search" : "/search"}
                method="get"
                onSubmit={() => setSearchOpen(false)}
              >
                <div className="group relative mt-6">
                  <div className="flex items-end gap-3 border-b border-ink/20 pb-3 transition-colors focus-within:border-transparent">
                    <Search className="mb-1.5 size-5 shrink-0 text-gold" />
                    <input
                      name="q"
                      autoFocus
                      autoComplete="off"
                      placeholder={t("searchPlaceholder")}
                      aria-label={t("search")}
                      className="w-full bg-transparent font-display text-2xl italic text-ink placeholder:text-fog/70 focus:outline-none md:text-[28px]"
                    />
                    <button
                      type="submit"
                      aria-label={t("search")}
                      className="mb-0.5 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-white transition-all hover:bg-gold hover:text-ink"
                    >
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                  {/* The gold draw-line: sweeps in from the centre on focus */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[2px] origin-center scale-x-0 bg-gold transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within:scale-x-100"
                  />
                </div>
              </form>
              <p className="mt-4 text-[12px] tracking-wide text-fog">
                {t("searchHint")}
              </p>
            </div>
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
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold-soft to-transparent"
            />
            <p className="eyebrow mb-6 text-center text-gold">
              {tShop("title")}
            </p>
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
                    className="font-display text-lg  text-ink transition hover:text-gold"
                  >
                    {col.heading}
                  </Link>
                  <span className="mt-2.5 block h-px w-9 bg-gold-soft" />
                  <ul className="mt-3.5 space-y-2.5">
                    {col.links.map((l) => {
                      const Icon = l.icon ? MENU_ICONS[l.icon] : null;
                      const inner = (
                        <>
                          {Icon && (
                            <Icon className="size-3.5 shrink-0 text-gold/80 transition group-hover:text-gold" />
                          )}
                          {l.label}
                          {l.external && <ArrowUpRight className="size-3.5" />}
                        </>
                      );
                      return l.external ? (
                        <li key={l.href}>
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex items-center gap-2 text-[13px] text-espresso transition hover:text-gold"
                          >
                            {inner}
                          </a>
                        </li>
                      ) : (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            onClick={() => setShopOpen(false)}
                            className="group inline-flex items-center gap-2 text-[13px] text-espresso transition hover:text-gold"
                          >
                            {inner}
                          </Link>
                        </li>
                      );
                    })}
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
              <button
                onClick={closeMenu}
                aria-label={t("closeMenu")}
                className="cursor-pointer p-2 text-ink"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav
              className="flex-1 overflow-y-auto px-6 py-6"
              aria-label="Mobile"
            >
              {[
                <Link
                  key="about"
                  href={left[0].href}
                  onClick={closeMenu}
                  className="block py-3 font-display text-2xl text-ink"
                >
                  {left[0].label}
                </Link>,
                <button
                  key="shop"
                  onClick={() => setMobileShopOpen((v) => !v)}
                  className="flex w-full cursor-pointer items-center justify-between py-3 font-display text-2xl text-ink"
                >
                  {left[1].label}
                  <ChevronDown
                    className={`size-5 transition ${mobileShopOpen ? "rotate-180" : ""}`}
                  />
                </button>,
                ...right.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={closeMenu}
                    className="block py-3 font-display text-2xl text-ink"
                  >
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
                      <Link
                        href={col.href}
                        onClick={closeMenu}
                        className="font-display text-lg italic text-gold"
                      >
                        {col.heading}
                      </Link>
                      {col.links.map((l) => {
                        const Icon = l.icon ? MENU_ICONS[l.icon] : null;
                        const cls =
                          "flex items-center gap-2.5 py-1.5 pl-3 text-sm text-espresso";
                        return l.external ? (
                          <a
                            key={l.href}
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            className={cls}
                          >
                            {Icon && <Icon className="size-4 text-gold/80" />}
                            {l.label} ↗
                          </a>
                        ) : (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={closeMenu}
                            className={cls}
                          >
                            {Icon && <Icon className="size-4 text-gold/80" />}
                            {l.label}
                          </Link>
                        );
                      })}
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
                    className={`cursor-pointer border px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] ${
                      locale === l
                        ? "border-ink bg-ink text-white"
                        : "border-ink/20 text-espresso"
                    }`}
                  >
                    {l === "en" ? t("english") : t("arabic")}
                  </button>
                ))}
              </span>
              <Link
                href="/locate-us"
                onClick={closeMenu}
                className="link-underline mt-6 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
              >
                <MapPin className="size-4 text-gold" />
                {t("locateUs")}
              </Link>
              {shopper ? (
                <div className="mt-6 border-t border-ink/10 pt-2">
                  <button
                    onClick={() => setMobileAccountOpen((v) => !v)}
                    aria-expanded={mobileAccountOpen}
                    className="flex w-full cursor-pointer items-center gap-3 py-3"
                  >
                    <ShopperAvatar url={shopper.avatar} name={shopper.name} className="size-10" />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
                        {shopper.name}
                      </span>
                      <span className="block truncate text-[11px] text-fog" dir="ltr">
                        {shopper.email}
                      </span>
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-gold transition-transform duration-300 ${mobileAccountOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className="grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ gridTemplateRows: mobileAccountOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col items-start gap-3 pb-2 ps-[52px]">
                        {(
                          [
                            { href: "/account", label: t("myAccount"), Icon: User },
                            { href: "/account/orders", label: t("myOrders"), Icon: Package },
                            { href: "/account/coupons", label: t("myRewards"), Icon: Ticket },
                            { href: "/account/wishlist", label: tAcc("wishlistTitle"), Icon: Heart },
                          ] as const
                        ).map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={closeMenu}
                            className="link-underline flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
                          >
                            <l.Icon className="size-4 text-gold" />
                            {l.label}
                          </Link>
                        ))}
                        <button
                          onClick={signOut}
                          className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9c2b2e]"
                        >
                          <LogOut className="size-4" />
                          {t("signOut")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/account"
                  onClick={closeMenu}
                  className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
                >
                  {t("loginSignup")}
                </Link>
              )}
            </nav>
          </div>
        )}

        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    </header>
  );
}
