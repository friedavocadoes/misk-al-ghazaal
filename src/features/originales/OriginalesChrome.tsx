"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";
import { CartDrawer } from "@/components/blocks/CartDrawer";
import { SearchSuggest } from "@/components/search/SearchSuggest";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  editionFor,
  originalesPath,
  RETURN_KEY,
  safeReturnPath,
} from "./config";
import s from "./originales.module.css";

export function OriginalesChrome({
  products,
  children,
}: {
  products: Product[];
  children: ReactNode;
}) {
  const ar = useLocale() === "ar";
  const path = usePathname();
  const collectionPage = path === "/originales" || path === "/originales/";
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
      <Link className={s.indexLink} href="/originales">
        {ar ? "المجموعة" : "The collection"}
        <ArrowUpRight size={13} />
      </Link>
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
              src={edition.bottle ?? product.images[0] ?? "/logo.webp"}
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
      {back}
    </nav>
  );
  return (
    <div
      className={`${s.world} ${collectionPage ? s.collectionWorld : ""}`}
      dir={ar ? "rtl" : "ltr"}
    >
      <header className={s.header}>
        <div className={s.headerLeft}>
          <button
            type="button"
            aria-label={ar ? "المجموعة" : "Explore the collection"}
            onClick={() => setMenu(true)}
            className={`${s.mobileMenu} ${collectionPage ? s.collectionMenu : ""}`}
          >
            <Menu />
          </button>
          <Link
            href="/originales"
            className={s.wordmark}
            aria-label="MAG Parfum — Originales"
          >
            MAG<span>PARFUM</span>
          </Link>
        </div>
        <Link href="/originales" className={s.headerEdition}>
          ORIGINALES<span>{ar ? "تعبير أصيل" : "An original expression"}</span>
        </Link>
        <div className={s.tools}>
          <button
            type="button"
            aria-label={ar ? "البحث" : "Search fragrances"}
            onClick={() => setSearch(true)}
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
            data-bag-target
            data-ios-haptic="on"
            aria-label={`${ar ? "الحقيبة" : "Shopping bag"} (${count})`}
            onClick={() => setBag(true)}
          >
            <ShoppingBag />
            <span className={s.bagCount}>{count}</span>
          </button>
        </div>
      </header>
      {!collectionPage && <aside className={s.rail}>{editions}</aside>}
      <div className={s.content}>
        {children}
        <footer className={s.footer}>
          <span>MAG PARFUM · ORIGINALES</span>
          {back}
          <span>
            {ar
              ? "فن العطر. تعبيرك الخاص."
              : "The art of perfume. An expression of you."}
          </span>
        </footer>
      </div>
      <CartDrawer open={bag} onOpenChange={setBag} />
      <Sheet open={search} onOpenChange={setSearch}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {ar ? "اكتشف عطرك" : "Find your expression"}
            </SheetTitle>
          </SheetHeader>
          <div className="p-6">
            <SearchSuggest
              placeholder={ar ? "ابحث عن عطر" : "Search fragrances…"}
              autoFocus
              recentKey="misk-search-recents"
              pickHref={(item) => `/product/${item.slug}`}
              submitLabel={(term) =>
                ar ? `البحث عن ${term}` : `Search for ${term}`
              }
              onSubmitTerm={(term) =>
                router.push(`/search?q=${encodeURIComponent(term)}`)
              }
              onNavigate={() => setSearch(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent>
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
