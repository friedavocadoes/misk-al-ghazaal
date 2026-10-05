"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { CartDrawer } from "./CartDrawer";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="bg-emerald-950 px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-emerald-50">
        Free delivery across UAE on orders above AED 200 · Cash on Delivery
        available
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <button
          className="rounded-full p-2 hover:bg-stone-100 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Link href="/" className="text-xl font-bold tracking-tight text-emerald-950">
          GAZAAL<span className="text-amber-600">.</span>
        </Link>
        <div className="ml-6 hidden lg:block">
          <MegaMenu />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="rounded-full p-2 hover:bg-stone-100"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>
          <Link
            href="/account"
            className="hidden rounded-full p-2 hover:bg-stone-100 sm:block"
            aria-label="Account"
          >
            <User className="size-5" />
          </Link>
          <button
            className="relative rounded-full p-2 hover:bg-stone-100"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingBag className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-900 text-[10px] font-bold text-white">
              2
            </span>
          </button>
        </div>
      </div>
      {searchOpen && (
        <div className="border-t border-stone-100 px-4 py-3">
          <form
            action="/search"
            method="get"
            className="mx-auto flex max-w-2xl gap-2"
          >
            <Input name="q" placeholder="Search perfumes, bakhoor, oudh…" autoFocus />
            <Button type="submit">Search</Button>
          </form>
        </div>
      )}
      {menuOpen && (
        <nav className="max-h-[60vh] overflow-y-auto border-t border-stone-100 px-4 py-3 lg:hidden">
          <MegaMenu />
        </nav>
      )}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
