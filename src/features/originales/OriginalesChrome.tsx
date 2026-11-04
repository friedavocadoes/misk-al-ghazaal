"use client";

import { PrivacySettingsButton } from "@/components/analytics/PrivacyNotice";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  Globe2,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { haptic } from "@/lib/haptics";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";
import { CartDrawer } from "@/components/blocks/CartDrawer";
import { SearchSuggest } from "@/components/search/SearchSuggest";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  editionFor,
  originalesPath,
  RETURN_KEY,
  safeReturnPath,
  storefrontProductPath,
} from "./config";
import s from "./atelier.module.css";
import { useAtelierMotion } from "./useAtelierMotion";
import { AtelierScrollContext, useOriginalesSmoother } from "./atelier-scroll";

export function OriginalesChrome({
  products,
  children,
  fontClassName = "",
}: {
  products: Product[];
  children: ReactNode;
  fontClassName?: string;
}) {
  const ar = useLocale() === "ar";
  const path = usePathname();
  const collectionPage = path === "/originales" || path === "/originales/";
  const root = useRef<HTMLDivElement>(null);
  const atelierScroll = useOriginalesSmoother(root, collectionPage);
  useAtelierMotion(root, path, atelierScroll);
  useLayoutEffect(() => {
    document.body.dataset.originales = "true";
    return () => {
      delete document.body.dataset.originales;
    };
  }, []);
  const selectedEdition = products.find(
    (product) => originalesPath(product) === path,
  );
  const drawerTint = selectedEdition
    ? editionFor(selectedEdition).wash
    : undefined;
  const query = useSearchParams();
  const router = useRouter();
  const { count } = useCart();
  const [bag, setBag] = useState(false);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  useEffect(() => {
    let live = true;
    let changed = false;
    const db = createClient();
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (live) setSignedIn(!!session);
    });
    db.auth
      .getUser()
      .then(({ data }) => {
        if (live && !changed) setSignedIn(!!data.user);
      })
      .catch(() => {});
    try {
      const remembered = safeReturnPath(sessionStorage.getItem(RETURN_KEY));
      const ref = document.referrer ? new URL(document.referrer) : null;
      const previous =
        ref?.origin === location.origin
          ? safeReturnPath(ref.pathname + ref.search)
          : null;
      queueMicrotask(() => {
        if (live) setReturnTo(remembered ?? previous ?? "/");
      });
    } catch {}
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const back = (
    <a href={returnTo} className={s.returnLink}>
      <ArrowLeft size={16} />
      <span>
        {ar ? "العودة إلى" : "Return to"}
        <br />
        <strong>Misk Al Ghazaal</strong>
      </span>
    </a>
  );
  const editions = (
    <nav
      aria-label={ar ? "عطور أوريجينال" : "The Originales collection"}
      className={s.editionNav}
    >
      {products.map((product) => {
        const edition = editionFor(product);
        const active = path === originalesPath(product);
        return (
          <Link
            key={product.id}
            href={originalesPath(product)}
            className={s.editionLink}
            aria-current={active ? "page" : undefined}
            style={
              { "--edition-accent": edition.accent } as React.CSSProperties
            }
          >
            <span className={s.railNumber}>{edition.number}</span>
            <Image
              src={edition.bottle ?? product.images[0] ?? "/mag.webp"}
              alt=""
              width={70}
              height={104}
              sizes="60px"
              className={s.railBottle}
            />
            <span>{edition.name}</span>
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div
      ref={root}
      className={`${s.world} ${fontClassName} ${collectionPage ? s.collectionWorld : ""}`}
      dir={ar ? "rtl" : "ltr"}
    >
      <header className={s.header}>
        {collectionPage && (
          <span
            data-collection-header-backdrop
            className={s.collectionHeaderBackdrop}
            aria-hidden="true"
          />
        )}
        <div className={s.headerLeft}>
          {!collectionPage && (
            <button
              type="button"
              aria-label={ar ? "المجموعة" : "Explore the collection"}
              onClick={() => setMenu(true)}
              data-haptic="open"
              data-ios-haptic="on"
              className={s.mobileMenu}
            >
              <Menu />
            </button>
          )}
          <Link
            href="/originales"
            className={s.wordmark}
            aria-label="MAG Parfum — Originales"
          >
            MAG<span>PARFUM</span>
          </Link>
        </div>
        {collectionPage ? (
          <a
            href="#originales-top"
            data-collection-title-dock
            className={`${s.headerEdition} ${s.editionWordmark}`}
          >
            ORIGINALES
          </a>
        ) : (
          <Link
            href="/originales"
            className={`${s.headerEdition} ${s.editionWordmark}`}
          >
            ORIGINALES
          </Link>
        )}
        <div className={s.tools}>
          <a
            href={returnTo}
            className={s.collectionReturn}
            aria-label="Misk Al Ghazaal"
          >
            <ArrowLeft aria-hidden="true" />
            <span aria-hidden="true">Misk Al Ghazaal</span>
          </a>
          <button
            type="button"
            aria-label={ar ? "البحث" : "Search fragrances"}
            onClick={() => setSearch(true)}
            data-haptic="open"
          >
            <Search />
          </button>
          <Link href="/locate-us" aria-label={ar ? "المتاجر" : "Find in store"}>
            <MapPin />
          </Link>
          <Link
            href={
              signedIn
                ? "/account"
                : `/account/login?next=${encodeURIComponent(path)}`
            }
            aria-label={ar ? "حسابك" : "Your account"}
          >
            <UserRound />
            <span className={s.sessionDot} data-active={signedIn} />
          </Link>
          <button
            type="button"
            aria-label={ar ? "تغيير اللغة" : "Switch language"}
            onClick={() =>
              router.replace(
                `${path}${query.size ? `?${query.toString()}` : ""}`,
                { locale: ar ? "en" : "ar", scroll: false },
              )
            }
          >
            <Globe2 />
            <span>{ar ? "EN" : "AR"}</span>
          </button>
          <button
            type="button"
            data-haptic="open"
            data-bag-target
            data-ios-haptic="on"
            aria-label={`${ar ? "الحقيبة" : "Shopping bag"} (${count})`}
            onClick={() => setBag(true)}
          >
            <ShoppingBag />
            <span key={count} className={s.bagCount}>
              {count}
            </span>
          </button>
        </div>
      </header>
      {!collectionPage && <aside className={s.rail}>{editions}</aside>}
      <div data-atelier-scroll-wrapper>
        <div data-atelier-scroll-content>
          <div className={s.content}>
            <AtelierScrollContext.Provider value={atelierScroll}>
              {children}
            </AtelierScrollContext.Provider>
            <footer className={s.footer}>
              <span>MAG PARFUM · ORIGINALES</span>
              {back}
              <nav
                aria-label={ar ? "روابط قانونية" : "Legal"}
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                <Link href="/pages/terms">
                  {ar ? "الشروط والأحكام" : "Terms & Conditions"}
                </Link>
                <Link href="/pages/privacy">
                  {ar ? "سياسة الخصوصية" : "Privacy Policy"}
                </Link>
                <PrivacySettingsButton />
              </nav>
              <span>
                {ar
                  ? "فن العطر. تعبيرك الخاص."
                  : "The art of perfume. An expression of you."}
              </span>
            </footer>
          </div>
        </div>
      </div>
      <CartDrawer
        open={bag}
        onOpenChange={setBag}
        originales
        originalesTint={drawerTint}
      />
      <Sheet open={search} onOpenChange={setSearch}>
        <SheetContent
          data-originales-drawer="search"
          dir={ar ? "rtl" : "ltr"}
          style={{ "--drawer-tint": drawerTint } as React.CSSProperties}
        >
          <SheetHeader>
            <span className="originales-drawer-kicker">
              MAG PARFUM · ORIGINALES
            </span>
            <SheetTitle>{ar ? "اكتشف عطرك" : "Find a fragrance"}</SheetTitle>
            <SheetDescription className="sr-only">
              {ar
                ? "ابحث بالاسم أو تصفح المجموعة"
                : "Search by name or browse the collection"}
            </SheetDescription>
          </SheetHeader>
          <div className="originales-search-body">
            <div className="originales-search-field">
              <Search size={18} aria-hidden="true" />
              <SearchSuggest
                placeholder={ar ? "ابحث عن عطر" : "Search fragrances…"}
                autoFocus
                recentKey="mag-originales-search-recents"
                pickHref={storefrontProductPath}
                inputClassName="originales-search-input"
                resultsClassName="originales-search-results"
                submitLabel={(term) =>
                  ar ? `البحث عن ${term}` : `Search for ${term}`
                }
                onSubmitTerm={(term) =>
                  router.push(`/search?q=${encodeURIComponent(term)}`)
                }
                onNavigate={() => setSearch(false)}
              />
            </div>
            {products.length > 0 && (
              <section
                className="originales-search-editions"
                aria-label={ar ? "المجموعة" : "The collection"}
              >
                <p className="originales-drawer-kicker">
                  {ar ? "المجموعة" : "The collection"}
                </p>
                <ul>
                  {products.map((product) => {
                    const edition = editionFor(product);
                    return (
                      <li key={product.id}>
                        <Link
                          href={originalesPath(product)}
                          onClick={() => setSearch(false)}
                          style={
                            {
                              "--drawer-edition": edition.accent,
                            } as React.CSSProperties
                          }
                        >
                          <span className="originales-search-bottle">
                            <Image
                              src={
                                edition.bottle ??
                                product.images[0] ??
                                "/mag.webp"
                              }
                              alt=""
                              width={84}
                              height={120}
                              sizes="62px"
                            />
                          </span>
                          <span>{edition.name}</span>
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Sheet
        open={menu}
        onOpenChange={(open) => {
          setMenu(open);
          if (!open) haptic("close");
        }}
      >
        <SheetContent
          data-originales-menu
          className="!left-0 !right-auto data-[state=open]:!animate-[originales-menu-in_0.6s_cubic-bezier(.22,.75,.18,1)] data-[state=closed]:!animate-[originales-menu-out_0.4s_cubic-bezier(.45,0,.2,1)]"
        >
          <SheetHeader>
            <SheetTitle>ORIGINALES</SheetTitle>
          </SheetHeader>
          <div
            className={s.mobileEditions}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setMenu(false);
            }}
          >
            {editions}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
