"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatAED } from "@/lib/utils";
import { products } from "@/lib/mock-data";

const DEMO_ITEMS = [
  { productSlug: "misk-al-ghazaal", qty: 1 },
  { productSlug: "jawahara-bakhoor-tablets", qty: 2 },
];

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lines = DEMO_ITEMS.map((item) => ({
    ...item,
    product: products.find((p) => p.slug === item.productSlug)!,
  })).filter((l) => l.product);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your Cart ({lines.reduce((s, l) => s + l.qty, 0)})</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">
              Your cart is empty.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {lines.map(({ product, qty }) => (
                <li key={product.slug} className="flex gap-4 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="size-16 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-900">
                      {product.title}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {formatAED(product.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="rounded-full border p-1" aria-label="Decrease">
                        <Minus className="size-3" />
                      </button>
                      <span className="text-sm font-medium">{qty}</span>
                      <button className="rounded-full border p-1" aria-label="Increase">
                        <Plus className="size-3" />
                      </button>
                      <button
                        className="ml-auto p-1 text-stone-400 hover:text-red-600"
                        aria-label="Remove"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-stone-100 px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-sm font-semibold">
            <span>Subtotal</span>
            <span>{formatAED(subtotal)}</span>
          </div>
          <div className="grid gap-2">
            <Button asChild onClick={() => onOpenChange(false)}>
              <Link href="/cart">View Cart</Link>
            </Button>
            <Button variant="outline" asChild onClick={() => onOpenChange(false)}>
              <Link href="/cart">Checkout (soon)</Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
