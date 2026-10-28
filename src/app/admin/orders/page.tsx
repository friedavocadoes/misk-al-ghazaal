import { getNotificationSettings } from "@/lib/notification-settings";
import { mailAllowed } from "@/lib/notification-rules";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { OrdersWorkspace } from "@/components/admin/orders/OrdersWorkspace";
export default async function OrdersPage(){
 const staff=await getAdminSession();if(!staff)redirect("/admin/login");
 const settings=await getNotificationSettings();
 return <><AdminNav email={staff.email} role={staff.role}/><OrdersWorkspace emailEnabled={mailAllowed(settings,"order_updates")}/></>;
}
