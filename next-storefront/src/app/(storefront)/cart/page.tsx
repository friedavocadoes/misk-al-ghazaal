import {
  CartLineItems,
  CartSummary,
  TrendingUpsell,
} from "@/components/blocks/CartBlocks";
import { getProduct, getProductsByCategory } from "@/lib/mock-data";

const DEMO_CART = [
  { productSlug: "misk-al-ghazaal", qty: 1 },
  { productSlug: "jawahara-bakhoor-tablets", qty: 2 },
];

export default function CartPage() {
  const lines = DEMO_CART.map((l) => ({
    product: getProduct(l.productSlug)!,
    qty: l.qty,
  })).filter((l) => l.product);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-900">Your Cart</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <CartLineItems lines={lines} />
        <CartSummary subtotal={subtotal} />
      </div>
      <TrendingUpsell products={getProductsByCategory("best-sellers")} />
    </div>
  );
}
