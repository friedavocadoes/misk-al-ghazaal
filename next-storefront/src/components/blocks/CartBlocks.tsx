import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatAED } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductCard } from "./ProductCard";

export interface CartLine {
  product: Product;
  qty: number;
}

export function CartLineItems({ lines }: { lines: CartLine[] }) {
  if (lines.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed py-16 text-center">
        <p className="font-semibold">Your cart is empty</p>
        <Button asChild className="mt-4">
          <Link href="/collections">Continue shopping</Link>
        </Button>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-stone-100 rounded-3xl border border-stone-100 bg-white">
      {lines.map(({ product, qty }) => (
        <li key={product.slug} className="flex gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[0]}
            alt={product.title}
            className="size-20 rounded-2xl object-cover"
          />
          <div className="flex-1">
            <Link
              href={`/product/${product.slug}`}
              className="text-sm font-semibold hover:text-emerald-900"
            >
              {product.title}
            </Link>
            <p className="mt-1 text-sm text-stone-500">
              Qty {qty} · {formatAED(product.price * qty)}
            </p>
          </div>
          <button
            className="self-start p-1 text-stone-400 hover:text-red-600"
            aria-label={`Remove ${product.title}`}
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CartSummary({ subtotal }: { subtotal: number }) {
  return (
    <aside className="h-fit rounded-3xl border border-stone-100 bg-white p-6">
      <h2 className="font-bold">Order Summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-stone-500">Subtotal</dt>
          <dd className="font-semibold">{formatAED(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-stone-500">Shipping</dt>
          <dd className="font-semibold">
            {subtotal >= 400 ? "Free" : formatAED(26)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-stone-100 pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd>{formatAED(subtotal + (subtotal >= 400 ? 0 : 26))}</dd>
        </div>
      </dl>
      <Button className="mt-5 w-full" size="lg">
        Checkout (coming soon)
      </Button>
      <p className="mt-3 text-center text-xs text-stone-400">
        Checkout / Supabase orders land in Phase 2.
      </p>
    </aside>
  );
}

export function TrendingUpsell({ products }: { products: Product[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold">Trending Products</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
