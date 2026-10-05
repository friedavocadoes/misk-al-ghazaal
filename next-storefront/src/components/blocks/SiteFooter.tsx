import Link from "next/link";
import { NewsletterSection } from "./NewsletterSection";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200 bg-stone-50">
      <NewsletterSection />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-emerald-950">GAZAAL.</p>
          <p className="mt-2 text-sm text-stone-600">
            Misk Al Ghazaal perfumes, dukhoon, bakhoor and holy oudh — crafted
            for the UAE.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li><Link href="/collection/best-sellers" className="hover:text-emerald-900">Best Sellers</Link></li>
            <li><Link href="/collection/new-arrivals" className="hover:text-emerald-900">New Arrivals</Link></li>
            <li><Link href="/collection/dukhoon" className="hover:text-emerald-900">Dukhoon / Bakhoor</Link></li>
            <li><Link href="/collection/holy-oudh" className="hover:text-emerald-900">Holy Oudh</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">Support</p>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li><Link href="/pages/contact" className="hover:text-emerald-900">Contact</Link></li>
            <li><Link href="/pages/faq" className="hover:text-emerald-900">FAQ & Shipping</Link></li>
            <li><Link href="/pages/terms" className="hover:text-emerald-900">Returns & Terms</Link></li>
            <li><Link href="/pages/wishlist" className="hover:text-emerald-900">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-900">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li><Link href="/pages/about" className="hover:text-emerald-900">About Us</Link></li>
            <li><Link href="/blog" className="hover:text-emerald-900">Journal</Link></li>
            <li><Link href="/pages/wholesale" className="hover:text-emerald-900">Wholesale</Link></li>
            <li><Link href="/pages/sitemap" className="hover:text-emerald-900">Sitemap</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-200 py-5 text-center text-xs text-stone-500">
        © 2026 Gazaal Perfumes · Prices in AED · Cash on Delivery within UAE
      </div>
    </footer>
  );
}
