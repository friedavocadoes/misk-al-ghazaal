import { setRequestLocale } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { RouteProgress } from "@/components/blocks/RouteProgress";
import { SiteHeader } from "@/components/blocks/SiteHeader";
import { SiteFooter } from "@/components/blocks/SiteFooter";
import { SmoothScroll } from "@/components/blocks/SmoothScroll";

export default async function StorefrontLayout(
  props: LayoutProps<"/[locale]">
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  return (
    <CartProvider>
      <WishlistProvider>
        {/* RouteProgress + fixed header live at body level, outside the
            transformed flow. The bar is hardcore `fixed` (zero JS in its
            positioning — it cannot move); `#smooth-content` reserves its
            live height as padding-top (see SmoothScroll) so geometry
            matches in-flow layout exactly, morph included. */}
        <RouteProgress />
        <SiteHeader locale={locale} />
        <div id="smooth-wrapper">
          <div id="smooth-content">
            <main className="min-h-[60vh]">{props.children}</main>
            <SiteFooter locale={locale} />
          </div>
        </div>
        <SmoothScroll />
      </WishlistProvider>
    </CartProvider>
  );
}
