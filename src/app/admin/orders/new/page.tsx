import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { CreateOrderForm } from "@/components/admin/orders/CreateOrderForm";
export default async function NewOrder(){const staff=await getAdminSession();if(!staff)redirect("/admin/login");return <><AdminNav email={staff.email} role={staff.role}/><CreateOrderForm/></>;}
