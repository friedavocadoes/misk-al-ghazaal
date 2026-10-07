import { redirect } from "next/navigation";

// Dashboard removed — land directly on orders (every role can see it).
export default function AdminHome() {
  redirect("/admin/orders");
}
