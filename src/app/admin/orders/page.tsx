import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { OrdersWorkspace } from "@/components/admin/orders/OrdersWorkspace";
export default async function OrdersPage(){
 const staff=await getAdminSession();if(!staff)redirect("/admin/login");
 return <><AdminNav email={staff.email} role={staff.role}/><OrdersWorkspace/></>;
}
