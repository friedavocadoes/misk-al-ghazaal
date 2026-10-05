"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { CartDrawer } from "./CartDrawer";
import { SITE, getMegaMenu } from "@/lib/site";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const menu = getMegaMenu();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="bg-ink px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
        {SITE.announcement}
      </div>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-2 px-5 md:px-8">
        <button
          className="border border-transparent p-2 text-ink hover:border-ink/20 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link
          href="/"
          className="font-display text-[26px] tracking-[0.08em] text-ink"
          aria-label="Gazaal home"
        >
          GAZAAL
        </Link>
        <div className="ml-8 hidden lg:block">
          <MegaMenu items={menu} />
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            className="p-2.5 text-espresso transition hover:text-gold"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
          >
            <Search className="size-[18px]" />
          </button>
          <Link
            href="/account"
            className="hidden p-2.5 text-espresso transition hover:text-gold sm:block"
            aria-label="Account"
          >
            <User className="size-[18px]" />
          </Link>
          <button
            className="relative p-2.5 text-espresso transition hover:text-gold"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingBag className="size-[18px]" />
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center bg-ink text-[9px] font-bold text-white">
              2
            </span>
          </button>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t border-ink/10 bg-cream px-5 py-4">
          <form
            action="/search"
            method="get"
            className="mx-auto flex max-w-2xl gap-2"
          >
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
      {menuOpen && (
        <nav className="max-h-[65vh] overflow-y-auto border-t border-ink/10 bg-cream px-5 py-4 lg:hidden">
          <MegaMenu items={menu} />
        </nav>
      )}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
