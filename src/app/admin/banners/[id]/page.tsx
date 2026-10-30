import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { isBannerPlacement } from "@/lib/banner-config";
import { AdminNav } from "@/components/admin/admin-nav";
import { BannerEditor } from "@/components/admin/banner-editor";
export default async function BannerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { id } = await params,
    db = await createClient();
  const { data, error } = await db
    .from("banners")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !isBannerPlacement(data.slot)) notFound();
  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <BannerEditor banner={data} />
    </>
  );
}
