"use client";
import { useCart } from "@/lib/cart";
import type { CartStockIssue } from "@/lib/pricing";
export function CartStockNotice({ issues }: { issues: CartStockIssue[] }) {
  const { remove, setQty } = useCart();
  if (!issues.length) return null;
  return (
    <div
      role="alert"
      className="my-5 rounded-xl border border-amber-300/60 bg-amber-50/60 p-4"
    >
      <p className="text-sm font-medium">Your bag needs a small update</p>
      <p className="mt-2 text-xs leading-5 text-espresso">
        Totals are shown below. Update these items to continue checkout.
      </p>
      {issues.map((i) => (
        <div
          key={`${i.slug}-${i.variantId}`}
          className="mt-4 border-t border-amber-200 pt-3"
        >
          <p className="text-sm">{i.title}</p>
          <p className="mt-1 text-xs text-espresso">
            {i.available
              ? `You selected ${i.requested}; only ${i.available} available.`
              : "This item is currently out of stock."}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            {i.available > 0 && (
              <button
                type="button"
                className="underline"
                onClick={() => setQty(i.slug, i.variantId, i.available)}
              >
                Change quantity to {i.available}
              </button>
            )}
            <button
              type="button"
              className="underline"
              onClick={() => remove(i.slug, i.variantId)}
            >
              Remove from bag
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
