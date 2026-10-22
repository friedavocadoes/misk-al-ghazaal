import { CartAbandonmentSurvey } from "@/components/analytics/CartAbandonmentSurvey";
import {ReviewInvitation} from "@/components/blocks/ReviewInvitation";
import { StorefrontToasts } from "@/components/blocks/StorefrontToasts";
import { getNavigationMenu } from "@/lib/navigation-menu";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import { getAdminSession } from "@/lib/admin-auth";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { RouteProgress } from "@/components/blocks/RouteProgress";
import { getNavigationBanners } from "@/lib/store";
import { SiteHeader } from "@/components/blocks/SiteHeader";
import { SiteFooter } from "@/components/blocks/SiteFooter";
import { AdminEditBar } from "@/components/blocks/AdminEditBar";

export default async function StorefrontLayout(
  props: LayoutProps<"/[locale]">
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  // Staff-only edit bar (null without a session — shoppers never see it).
  const [session, campaigns, shopMenu] = await Promise.all([getAdminSession(), getNavigationBanners(), getNavigationMenu(locale)]);
  const editable = session?.role === "super_admin";
  return (
    <CartProvider>
      <WishlistProvider>
        {/* RouteProgress + fixed header live at body level. The bar is
            hardcore `fixed` (zero JS in its positioning — it cannot move);
            `#page-content` reserves the header's live height as padding-top
            (synced pre-paint + RO inside SiteHeader) so geometry matches
            in-flow layout exactly, morph included. */}
        <CartAbandonmentSurvey/><StorefrontToasts /><ReviewInvitation/>
        <RouteProgress />
        <SiteHeader locale={locale} campaigns={campaigns} shopMenu={shopMenu} />
        <div id="page-content">
          {editable && <AdminEditBar />}
          <main className="min-h-[60vh]">{props.children}</main>
          <Suspense fallback={<div className="h-80 bg-sand/60" />}><SiteFooter locale={locale} /></Suspense>
        </div>
      </WishlistProvider>
    </CartProvider>
  );
}
