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
        {/* RouteProgress stays outside (fixed viewport bar). The header
            rides INSIDE the smoothed content: ScrollSmoother lifts the
            content to the viewport origin, so chrome left outside would
            leave the page starting behind the navbar. In-flow order
            (header → main → footer) is exactly the pre-smoother geometry,
            morph included — no padding/margin math needed. */}
        <RouteProgress />
        <div id="smooth-wrapper">
          <div id="smooth-content">
            <SiteHeader locale={locale} />
            <main className="min-h-[60vh]">{props.children}</main>
            <SiteFooter locale={locale} />
          </div>
        </div>
        <SmoothScroll />
      </WishlistProvider>
    </CartProvider>
  );
}
