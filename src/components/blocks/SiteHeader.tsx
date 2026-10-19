"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { BrandCrest } from "@/components/blocks/BrandCrest";
import gsap from "gsap";
import type { Banner } from "@/lib/types";
import { NavigationCampaigns } from "./NavigationCampaigns";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Globe,
  Heart,
  LogOut,
  MapPin,
  Package,
  Search,
  ShoppingBag,
  Ticket,
  User,
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
import { useCart } from "@/lib/cart";
import {
  SearchSuggest,
  type SearchSuggestHandle,
} from "@/components/search/SearchSuggest";

type LinkKey = "about" | "shop" | "manufacture" | "contact";

const EASE = "expo.out";
const FLIGHT = 0.6;

export function SiteHeader({ locale, campaigns = [] }: { locale: Locale; campaigns?: Banner[] }) {
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
  const suggestRef = useRef<SearchSuggestHandle>(null);
  // Badge pop: fly-to-bag ghosts dispatch `bag-landed` on arrival.
  const [bagPulse, setBagPulse] = useState(0);
  useEffect(() => {
    const onLanded = () => setBagPulse((n) => n + 1);
    window.addEventListener("bag-landed", onLanded);
    return () => window.removeEventListener("bag-landed", onLanded);
  }, []);
  const [langOpen, setLangOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  // Reserve the fixed header's exact height atop the page content
  // (before first paint — no flash of content behind the navbar), then
  // track it live across the scroll morph.
  useLayoutEffect(() => {
    const header = document.getElementById("site-header");
    const content = document.getElementById("page-content");
    if (!header || !content) return;
    const sync = () => {
      content.style.paddingTop = `${header.offsetHeight}px`;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Object.values(stackedRefs.current).forEach((el) => { if (el) el.style.opacity = compact ? "0" : "1"; });
      Object.values(inlineRefs.current).forEach((el) => { if (el) el.style.opacity = compact ? "1" : "0"; });
      return;
    }
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShopOpen(false); setMenuOpen(false); setAccountOpen(false); setLangOpen(false);
    };
    const onResize = () => setShopOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = document.querySelector<HTMLElement>("[data-mobile-navigation]");
    panel?.querySelector<HTMLElement>("button, a")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'));
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [menuOpen]);

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
    const apply = (
      u: {
        email?: string | null;
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      } | null,
    ) => {
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
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) =>
      apply(session?.user ?? null),
    );
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

  // Stage both frames and cancel both on close/unmount; no stale entrance callbacks.
  useLayoutEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      setShopEntered(false);
      if (shopOpen) second = requestAnimationFrame(() => setShopEntered(true));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [shopOpen]);

  useLayoutEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      setMenuEntered(false);
      if (menuOpen) second = requestAnimationFrame(() => setMenuEntered(true));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
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
      setAnchor({ x: cx, y: document.getElementById("site-header")!.getBoundingClientRect().bottom });
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
      aria-current={pathname === linkFor(key) ? "page" : undefined}
      onClick={(event) => { if (key === "shop") { event.preventDefault(); if (shopOpen) setShopOpen(false); else openShop(); } }}
      aria-expanded={key === "shop" ? shopOpen : undefined}
      aria-controls={key === "shop" ? "shop-navigation" : undefined}
      onKeyDown={(event) => { if (key === "shop" && event.key === "ArrowDown") { event.preventDefault(); openShop(); requestAnimationFrame(() => document.querySelector<HTMLElement>("#shop-navigation a")?.focus()); } }}
      onMouseEnter={() => key === "shop" && openShop()}
      onMouseLeave={() => key === "shop" && scheduleClose()}
      tabIndex={compact ? -1 : 0}
      aria-hidden={compact}
      className="maison-nav-link maison-stacked-link inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.22em] text-ink antialiased transition-colors hover:text-gold"
    >
      {labelFor(key)}
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
      aria-current={pathname === linkFor(key) ? "page" : undefined}
      onClick={(event) => { if (key === "shop") { event.preventDefault(); if (shopOpen) setShopOpen(false); else openShop(); } }}
      aria-expanded={key === "shop" ? shopOpen : undefined}
      aria-controls={key === "shop" ? "shop-navigation" : undefined}
      onKeyDown={(event) => { if (key === "shop" && event.key === "ArrowDown") { event.preventDefault(); openShop(); requestAnimationFrame(() => document.querySelector<HTMLElement>("#shop-navigation a")?.focus()); } }}
      onMouseEnter={() => key === "shop" && openShop()}
      onMouseLeave={() => key === "shop" && scheduleClose()}
      tabIndex={compact ? 0 : -1}
      aria-hidden={!compact}
      className="maison-nav-link maison-inline-link whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.12em] text-ink antialiased opacity-0 transition-colors hover:text-gold"
    >
      {labelFor(key)}
    </Link>
  );

  return (
    <header
      id="site-header"
      data-compact={compact}
      className="maison-header fixed inset-x-0 top-0 z-50 border-b border-ink/10 [overflow-anchor:none]"
    >
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
        className={`pointer-events-none absolute inset-0 ${compact ? "bg-cream/75" : "bg-cream/85"} backdrop-blur-md transition-opacity duration-500`}
        style={{ opacity: compact ? 1 : 0 }}
      />

      <div className="relative">
        {/* Main crest row — slimmer now that the wordmark sits in the page, not the bar */}
        <div
          className="maison-masthead mx-auto hidden max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-6 transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid"
          style={{ height: compact ? 72 : 112 }}
        >
          <div className="flex items-center">
            <span className="relative flex h-9 items-center">
              <button
                onClick={() => setLangOpen((v) => !v)}
                aria-label={t("language")}
                className="flex h-9 cursor-pointer items-center gap-1.5 px-2 text-espresso transition hover:text-gold"
              >
                <Globe className={glyph} />
                <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
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
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center text-espresso transition hover:text-gold"
            >
              <Search className={glyph} />
            </button>
            <span
              className={`flex items-center ${locale === "ar" ? "gap-7 ps-9" : "gap-6 ps-7"}`}
            >
              {inlineLink("about")}
              {inlineLink("shop")}
            </span>
          </div>

          <Link
            href="/"
            aria-label={t("home")}
            className="maison-signature group flex items-center justify-center justify-self-center"
          >
            <span className={`maison-signature-crest relative flex items-center justify-center transition-[width,height] duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] ${compact ? "size-16" : "size-[70px]"}`}>
              <span className={`block size-[88px] shrink-0 transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] ${compact ? "scale-[0.76]" : "scale-100"}`}>
                <BrandCrest compact={compact} />
              </span>
            </span>
            <span className="maison-wordmark" aria-hidden="true"><span>Misk Al Ghazaal</span><small>{locale === "ar" ? "دار العطور" : "PERFUMES"}</small></span>
          </Link>

          <div className="maison-utilities flex items-center justify-end">
            <span
              className={`flex items-center justify-end ${locale === "ar" ? "gap-7 pe-9" : "gap-6 pe-7"}`}
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
                <span className="maison-nav-link maison-inline-link whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em]">
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
                    <ShopperAvatar
                      url={shopper.avatar}
                      name={shopper.name}
                      className="size-6"
                    />
                  ) : (
                    <User className={`${glyph} shrink-0`} />
                  )}
                  {!compact && (
                    <span className="max-w-[120px] truncate whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.14em]">
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
                      <ShopperAvatar
                        url={shopper.avatar}
                        name={shopper.name}
                        className="size-10 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {shopper.name}
                        </span>
                        <span
                          className="block truncate text-[12px] text-fog"
                          dir="ltr"
                        >
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
                        {
                          href: "/account/orders",
                          label: t("myOrders"),
                          Icon: Package,
                        },
                        {
                          href: "/account/coupons",
                          label: t("myRewards"),
                          Icon: Ticket,
                        },
                        {
                          href: "/account/wishlist",
                          label: tAcc("wishlistTitle"),
                          Icon: Heart,
                        },
                      ] as const
                    ).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-3 px-5 py-2.5 text-left text-[12px] font-medium uppercase tracking-widest text-espresso transition hover:bg-sand hover:text-gold"
                      >
                        <l.Icon className="size-4 shrink-0 text-gold/80" />
                        {l.label}
                      </Link>
                    ))}
                    <button
                      onClick={signOut}
                      className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left text-[12px] font-medium uppercase tracking-widest text-espresso transition hover:bg-[#9c2b2e] hover:text-white"
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
                  <span className="maison-nav-link maison-inline-link whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em]">
                    {t("loginSignup")}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setCartOpen(true)}
              aria-label={t("bag")}
              data-bag-target
              className="relative flex size-9 cursor-pointer items-center justify-center text-espresso transition hover:text-gold"
            >
              <ShoppingBag className={glyph} />
              {bagCount > 0 && (
                <span
                  key={bagPulse}
                  className={`absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white ${bagPulse > 0 ? "animate-[bag-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)]" : ""}`}
                >
                  {bagCount > 99 ? "99" : bagCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stacked nav — grid halves keep the divider exactly under the crest */}
        <nav
          aria-label="Primary"
          className="maison-navigation hidden overflow-hidden border-t border-ink/10 transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block"
          style={{ maxHeight: compact ? 0 : 64, opacity: compact ? 0 : 1 }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-3.5 pb-4">
            <span
              className={`flex items-center justify-end ${locale === "ar" ? "gap-14 pe-12" : "gap-10 pe-8"}`}
            >
              {stackedLink("about")}
              {stackedLink("shop")}
            </span>
            <span
              aria-hidden
              className="size-1 rotate-45 justify-self-center bg-gold/60"
            />
            <span
              className={`flex items-center justify-start ${locale === "ar" ? "gap-14 ps-12" : "gap-10 ps-8"}`}
            >
              {stackedLink("manufacture")}
              {stackedLink("contact")}
            </span>
          </div>
        </nav>

        {/* Mobile bar */}
        <div className="maison-mobile-bar grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="mobile-menu-toggle cursor-pointer justify-self-start p-2 text-ink"
          >
            <span aria-hidden className="mobile-menu-lines"><span /><span /></span>
          </button>
          <Link href="/" aria-label={t("home")} className="mobile-brand-lockup justify-self-center">
            <span className="block size-11"><BrandCrest compact={compact} /></span><span className="mobile-brand-name"><span className="font-display">Misk Al Ghazaal</span><small>{locale === "ar" ? "دار العطور" : "PERFUMES"}</small></span>
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
              data-bag-target
              className="relative cursor-pointer p-2 text-espresso"
            >
              <ShoppingBag className="size-5" />
              {bagCount > 0 && (
                <span
                  key={bagPulse}
                  className={`absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white ${bagPulse > 0 ? "animate-[bag-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)]" : ""}`}
                >
                  {bagCount > 99 ? "99" : bagCount}
                </span>
              )}
            </button>
          </span>
        </div>

        {/* Search panel — a single underline, no boxes. The gold rule draws
            itself on focus; the serif field keeps it maison. */}
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
              {/* Live autocomplete: descriptive cards while typing, Enter
                  submits the full search (the arrow button does the same). */}
              <div className="group relative mt-6">
                <div className="flex items-end gap-3 border-b border-ink/20 pb-3 transition-colors focus-within:border-transparent">
                  <Search className="mb-1.5 size-5 shrink-0 text-gold" />
                  <SearchSuggest
                    ref={suggestRef}
                    autoFocus
                    recentKey="misk-search-recents"
                    placeholder={t("searchPlaceholder")}
                    inputClassName="w-full bg-transparent font-display text-2xl text-ink placeholder:text-fog/70 focus:outline-none md:text-[28px]"
                    pickHref={(it) => `/product/${it.slug}`}
                    submitLabel={(term) => `${t("searchAll")} “${term}”`}
                    onSubmitTerm={(term) => {
                      setSearchOpen(false);
                      router.push(`/search?q=${encodeURIComponent(term)}`);
                    }}
                    onNavigate={() => setSearchOpen(false)}
                  />
                  <button
                    type="button"
                    onClick={() => suggestRef.current?.submit()}
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
              <p className="mt-4 text-[12px] tracking-wide text-fog">
                {t("searchHint")}
              </p>
            </div>
          </div>
        )}

        {shopOpen && anchor && (
          <>
            <button aria-label={t("closeMenu")} tabIndex={-1} onClick={() => setShopOpen(false)} className="fixed inset-x-0 bottom-0 bg-ink/20 backdrop-blur-[2px]" style={{ top: anchor.y }} />
            <div id="shop-navigation" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}
              onKeyDown={(event) => { if (event.key === "Escape") { setShopOpen(false); (compact ? inlineRefs.current.shop : stackedRefs.current.shop)?.focus(); } }}
              className="maison-shop-panel fixed inset-x-0 z-[70] overflow-y-auto bg-[#f8f5ef]"
              style={{ top: anchor.y, maxHeight: `calc(100svh - ${anchor.y}px)`, opacity: shopEntered ? 1 : 0, transform: `translateY(${shopEntered ? 0 : -8}px)` }}>
              <div className="mx-auto max-w-[1500px] px-10 py-10 xl:px-16">
                <div className="mb-8 flex items-center justify-between border-b border-ink/15 pb-5">
                  <Link href={linkFor("shop")} onClick={() => setShopOpen(false)} className="group flex items-center gap-5 font-display text-3xl">{tShop("title")}<ArrowUpRight className="size-5 text-gold transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></Link>
                  <button onClick={() => setShopOpen(false)} aria-label={t("closeMenu")} className="cursor-pointer p-2"><X className="size-5" /></button>
                </div>
                <div className={campaigns.length ? "grid grid-cols-[1.25fr_1fr] gap-12" : "grid grid-cols-1"}>
                  <div className="grid grid-cols-3 gap-8">
                    {shop.map((col, index) => (
                      <div key={col.heading} className="maison-shop-column" style={{ transitionDelay: `${index * 60}ms` }}>
                        <span aria-hidden className="mb-3 block text-[10px] tracking-[.2em] text-gold">0{index + 1}</span>
                        <Link href={col.href} onClick={() => setShopOpen(false)} className="font-display text-2xl hover:text-gold">{col.heading}</Link>
                        <ul className="mt-5 space-y-3">{col.links.map((item) => <li key={item.href}>{item.external ? <a href={item.href} target="_blank" rel="noreferrer" className="maison-shop-link">{item.label}<ArrowUpRight className="size-3" /></a> : <Link href={item.href} onClick={() => setShopOpen(false)} className="maison-shop-link">{item.label}</Link>}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                  <NavigationCampaigns banners={campaigns} locale={locale} onNavigate={() => setShopOpen(false)} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Mobile menu overlay — staged enter/exit, staggered rows.
            Portaled to body so the overlay stays independent of header layers. */}
        {menuOpen &&
          createPortal(
            <>
            <div className="mobile-navigation-backdrop fixed inset-0 z-[59] bg-ink/35 backdrop-blur-[3px] transition-opacity duration-300 lg:hidden" style={{ opacity: menuEntered ? 1 : 0 }} onClick={closeMenu} aria-hidden="true" />
            <div
              id="mobile-navigation"
              className="mobile-navigation-panel fixed inset-y-0 start-0 z-[60] flex flex-col bg-cream lg:hidden"
              data-entered={menuEntered}
              role="dialog"
              aria-modal="true"
              aria-label={t("openMenu")}
              data-mobile-navigation
            >
              <div
                className="flex items-center justify-between border-b border-ink/10 px-4 py-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  opacity: menuEntered ? 1 : 0,
                  transform: `translateY(${menuEntered ? 0 : -12}px)`,
                }}
              >
                <Link href="/" onClick={closeMenu} className="flex items-center gap-3"><span className="block size-12"><BrandCrest compact /></span><span className="font-display text-lg">Misk Al Ghazaal<span className="mt-1 block font-sans text-[8px] tracking-[.28em] text-gold">{locale === "ar" ? "دار العطور" : "PERFUMES"}</span></span></Link>
                <button
                  onClick={closeMenu}
                  aria-label={t("closeMenu")}
                  className="cursor-pointer p-2 text-ink"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav
                className="mobile-navigation-content min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 pt-5"
                aria-label="Mobile"
              >
                {[
                  <Link
                    key="about"
                    href={left[0].href}
                    onClick={closeMenu}
                    className="block border-b border-ink/10 py-4 font-display text-3xl text-ink"
                  >
                    {left[0].label}
                  </Link>,
                  <button
                    key="shop"
                    onClick={() => setMobileShopOpen((v) => !v)}
                    aria-expanded={mobileShopOpen}
                    className="flex w-full cursor-pointer items-center justify-between border-b border-ink/10 py-4 font-display text-3xl text-ink"
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
                      className="block border-b border-ink/10 py-4 font-display text-3xl text-ink"
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
                      transitionDelay: menuEntered
                        ? `${120 + i * 60}ms`
                        : "0ms",
                    }}
                  >
                    <span className="mobile-navigation-row"><span aria-hidden className="mobile-navigation-index">0{i + 1}</span>{row}</span>
                {i === 1 && mobileShopOpen && (
                  <span className="mobile-shop-groups mt-2 grid grid-cols-1 gap-3 border-b border-ink/10 pb-6 ps-8">
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
                          const cls =
                            "flex items-center gap-2.5 py-1.5 ps-3 text-sm text-espresso";
                          return l.external ? (
                            <a
                              key={l.href}
                              href={l.href}
                              target="_blank"
                              rel="noreferrer"
                              className={cls}
                            >
                              {l.label} ↗
                            </a>
                          ) : (
                            <Link
                              key={l.href}
                              href={l.href}
                              onClick={closeMenu}
                              className={cls}
                            >
                              {l.label}
                            </Link>
                          );
                        })}
                      </span>
                    ))}
                  </span>
                )}
                  </span>
                ))}
                <div className="mt-6"><NavigationCampaigns banners={campaigns} locale={locale} onNavigate={closeMenu} /></div>
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
                      <ShopperAvatar
                        url={shopper.avatar}
                        name={shopper.name}
                        className="size-10"
                      />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
                          {shopper.name}
                        </span>
                        <span
                          className="block truncate text-[11px] text-fog"
                          dir="ltr"
                        >
                          {shopper.email}
                        </span>
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-gold transition-transform duration-300 ${mobileAccountOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        gridTemplateRows: mobileAccountOpen ? "1fr" : "0fr",
                      }}
                    >
                      <div className="overflow-hidden">
                        <div className="flex flex-col items-start gap-3 pb-2 ps-[52px]">
                          {(
                            [
                              {
                                href: "/account",
                                label: t("myAccount"),
                                Icon: User,
                              },
                              {
                                href: "/account/orders",
                                label: t("myOrders"),
                                Icon: Package,
                              },
                              {
                                href: "/account/coupons",
                                label: t("myRewards"),
                                Icon: Ticket,
                              },
                              {
                                href: "/account/wishlist",
                                label: tAcc("wishlistTitle"),
                                Icon: Heart,
                              },
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
            </>,
            document.body,
          )}

        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    </header>
  );
}