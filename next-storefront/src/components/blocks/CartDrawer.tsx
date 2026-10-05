"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatAED } from "@/lib/utils";
import { getProduct } from "@/lib/mock-data";

const DEMO_ITEMS = [
  { productSlug: "misk-al-ghazaal-abukhalid-50ml", qty: 1 },
  {
    productSlug: "jawahara-from-misk-al-ghazal-bakhoor-tablets-arabic-insence",
    qty: 2,
  },
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
    product: getProduct(item.productSlug)!,
  })).filter((l) => l.product);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            Your Bag ({lines.reduce((s, l) => s + l.qty, 0)})
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-fog">
              Your bag is empty.
            </p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {lines.map(({ product, qty }) => (
                <li key={product.slug} className="flex gap-4 py-4">
                  <span className="relative block size-16 shrink-0 overflow-hidden bg-sand">
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </span>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-ink">
                      {product.title}
                    </p>
                    <p className="mt-0.5 text-[13px] text-espresso">
                      {formatAED(product.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="flex items-center border border-ink/15">
                        <button className="p-1.5 text-espresso hover:text-ink" aria-label="Decrease">
                          <Minus className="size-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{qty}</span>
                        <button className="p-1.5 text-espresso hover:text-ink" aria-label="Increase">
                          <Plus className="size-3" />
                        </button>
                      </span>
                      <button
                        className="p-1 text-fog transition hover:text-[#9c2b2e]"
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
        <div className="border-t border-ink/10 px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="uppercase tracking-[0.16em] text-fog">Subtotal</span>
            <span className="font-display text-lg text-ink">{formatAED(subtotal)}</span>
          </div>
          <div className="grid gap-2">
            <Button asChild onClick={() => onOpenChange(false)}>
              <Link href="/cart">View Bag</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              onClick={() => onOpenChange(false)}
            >
              <Link href="/cart">Checkout</Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
