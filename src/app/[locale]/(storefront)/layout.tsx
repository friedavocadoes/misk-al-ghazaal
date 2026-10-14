import { setRequestLocale } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import { getAdminSession } from "@/lib/admin-auth";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { RouteProgress } from "@/components/blocks/RouteProgress";
import { SiteHeader } from "@/components/blocks/SiteHeader";
import { SiteFooter } from "@/components/blocks/SiteFooter";
import { SmoothScroll } from "@/components/blocks/SmoothScroll";
import { AdminEditBar } from "@/components/blocks/AdminEditBar";

export default async function StorefrontLayout(
  props: LayoutProps<"/[locale]">
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  // Staff-only edit bar (null without a session — shoppers never see it).
  const session = await getAdminSession();
  const editable = session?.role === "super_admin";
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
            {editable && <AdminEditBar />}
            <main className="min-h-[60vh]">{props.children}</main>
            <SiteFooter locale={locale} />
          </div>
        </div>
        <SmoothScroll />
      </WishlistProvider>
    </CartProvider>
  );
}
