import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AnalyticsDashboard } from "@/components/admin/analytics/AnalyticsDashboard";
import { ANALYTICS_SECTIONS, type AnalyticsSection } from "@/lib/analytics/dashboard";
export default async function AnalyticsPage({params}:{params:Promise<{section?:string[]}>}){
 const session=await getAdminSession(true);
 if(!session)redirect("/admin/login");
 if(session.role!=="super_admin"&&session.role!=="content_editor")redirect("/admin/orders");
 const parts=(await params).section??[];const section=parts[0]??"overview";
 if(parts.length>1||!ANALYTICS_SECTIONS.includes(section as AnalyticsSection))notFound();
 if(section==="customers"&&session.role!=="super_admin")redirect("/admin/analytics");
 return <><AdminNav email={session.email} role={session.role}/><AnalyticsDashboard section={section as AnalyticsSection} canExport={session.role==="super_admin"}/></>;
}
