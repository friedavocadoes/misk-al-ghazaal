import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import {
  BANNER_PLACEMENTS,
  isBannerPlacement,
  bannerIsVideo,
  type AdminBanner,
} from "@/lib/banner-config";
import { AdminNav } from "@/components/admin/admin-nav";
import { BannerCreateButton } from "@/components/admin/banner-create-button";
import { BannerWorkspace } from "@/components/admin/banner-workspace";
import { createBanner } from "./actions";
export default async function BannersPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const filters = await searchParams,
    slot =
      isBannerPlacement(filters.slot) && BANNER_PLACEMENTS[filters.slot].enabled
        ? filters.slot
        : "hero";
  const db = await createClient();
  const [list, summary, heroResult] = await Promise.all([
    db
      .from("banners")
      .select(
        "id,slot,sort,title,title_ar,src,fallback,mobile_src,mobile_fallback,href,is_active",
      )
      .eq("slot", slot)
      .is("deleted_at", null)
      .order("sort")
      .order("id")
      .limit(1000),
    db
      .from("banners")
      .select("slot,is_active")
      .is("deleted_at", null)
      .limit(3000),
    slot === "navigation"
      ? db
          .from("banners")
          .select("id,title,src")
          .eq("slot", "hero")
          .is("deleted_at", null)
          .order("sort")
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (list.error || summary.error)
    throw new Error(
      "Could not load banners. Apply migration_banner_workspace.sql if visibility has not been installed yet.",
    );
  const rows = (list.data || []) as AdminBanner[],
    placement = BANNER_PLACEMENTS[slot];
  const placements = Object.entries(BANNER_PLACEMENTS).filter(([, config]) => config.enabled);
  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <main className="admin-workspace banner-admin-workspace">
        <header className="banner-page-heading">
          <div>
            <p className="eyebrow">Storefront content</p>
            <h1>Banners</h1>
            <p>
              Manage each placement independently. Disabled artwork stays saved
              and is excluded from storefront reads.
            </p>
          </div>
          <div className="banner-heading-actions">
            <Link href="/admin/bin?tab=banners" className="banner-quiet">
              Recycle bin
            </Link>
            <BannerCreateButton
              key={slot}
              initialSlot={slot}
              create={createBanner}
              heroes={(heroResult.data || []).filter(
                (row) => !bannerIsVideo(row.src),
              )}
            />
          </div>
        </header>
        <nav className="banner-placement-tabs" aria-label="Banner placement" style={{gridTemplateColumns:`repeat(${placements.length},minmax(0,1fr))`}}>
          {placements
            .map(([key, config]) => {
              const items = (summary.data || []).filter(
                (row) => row.slot === key,
              );
              return (
                <Link
                  key={key}
                  href={`/admin/banners?slot=${key}`}
                  aria-current={slot === key ? "page" : undefined}
                >
                  <strong>
                    {config.label}
                    <span>{items.length}</span>
                  </strong>
                  <small>
                    {items.filter((row) => row.is_active).length} enabled
                  </small>
                </Link>
              );
            })}
        </nav>
        <div className="banner-placement-intro">
          <p>{placement.description}</p>
          <span>{placement.dimensions}</span>
        </div>
        <BannerWorkspace
          key={JSON.stringify(rows)}
          initialRows={rows}
          slot={slot}
        />
      </main>
    </>
  );
}
