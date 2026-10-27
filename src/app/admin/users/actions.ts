"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { logAdmin } from "@/lib/audit";
import { uuid } from "@/lib/analytics/shared";
import { canManageCustomer } from "@/lib/admin-customer";

export async function manageUser(fd: FormData) {
  const staff = await getAdminSession();
  if (staff?.role !== "super_admin")
    throw new Error("Only a super admin can manage accounts.");
  const id = String(fd.get("id") ?? ""),
    mode = String(fd.get("mode") ?? "");
  if (!uuid(id)) throw new Error("Invalid account.");
  const db = createAdminClient();
  const { data: profile, error: lookupError } = await db
    .from("profiles")
    .select("id,email,role")
    .eq("id", id)
    .single();
  if (lookupError || !profile)
    throw new Error("This account no longer exists.");
  if (mode === "role") {
    const role = String(fd.get("role") ?? "");
    if (id === staff.userId)
      throw new Error("You cannot change your own access.");
    if (!["customer", "orders", "super_admin", "content_editor"].includes(role))
      throw new Error("Invalid role.");
    const { error } = await db.from("profiles").update({ role }).eq("id", id);
    if (error) throw new Error(error.message);
    await logAdmin(db, staff, {
      category: "users",
      action: "role",
      entity: "profile",
      entityId: id,
      label: profile.email,
      summary: `Changed access: ${profile.role} → ${role}`,
      details: { from: profile.role, to: role },
    });
  } else {
    if (!canManageCustomer(staff.userId, id, profile.role))
      throw new Error(
        "These actions are available for customer accounts only. Staff accounts are protected.",
      );
    if (fd.get("confirm") !== "on")
      throw new Error("Confirm this account action first.");
    if (mode === "reset") {
      const { data: auth, error: authError } =
        await db.auth.admin.getUserById(id);
      if (authError || !auth.user?.email)
        throw new Error("No email is available for this account.");
      if (
        !auth.user.identities?.some((identity) => identity.provider === "email")
      )
        throw new Error(
          "This customer signs in through Google. They manage their password with Google.",
        );
      const { count, error: auditError } = await db
        .from("admin_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("entity_id", id)
        .eq("action", "password_reset")
        .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
      if (auditError)
        throw new Error("Could not check recent reset requests. Try again.");
      if (count)
        throw new Error(
          "A reset email was requested recently. Wait 10 minutes before sending another.",
        );
      const origin = new URL(
        (await headers()).get("origin") ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          "",
      );
      if (!["https:", "http:"].includes(origin.protocol))
        throw new Error("Configure the storefront origin first.");
      const { error } = await db.auth.resetPasswordForEmail(auth.user.email, {
        redirectTo: `${origin.origin}/account/reset`,
      });
      if (error) throw new Error(error.message);
    } else if (mode === "ban" || mode === "unban") {
      const { error } = await db.auth.admin.updateUserById(id, {
        ban_duration: mode === "ban" ? "876000h" : "none",
      });
      if (error) throw new Error(error.message);
    } else if (mode === "delete") {
      if (
        String(fd.get("email") ?? "")
          .trim()
          .toLowerCase() !== profile.email.toLowerCase()
      )
        throw new Error("Type the customer's email to confirm deletion.");
      // Shopper uploads live only in their own avatar folder. Storage ownership
      // otherwise prevents Auth deletion. Never touch shared product/invoice art.
      for (;;) {
        const { data: files, error } = await db.storage
          .from("avatars")
          .list(id, { limit: 100 });
        if (error)
          throw new Error(`Could not remove avatar files: ${error.message}`);
        if (!files?.length) break;
        const { error: removeError } = await db.storage
          .from("avatars")
          .remove(files.map((file) => `${id}/${file.name}`));
        if (removeError) throw new Error(removeError.message);
      }
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) throw new Error(`Account was not deleted: ${error.message}`);
    } else throw new Error("Unknown account action.");
    await logAdmin(db, staff, {
      category: "users",
      action: mode === "reset" ? "password_reset" : mode,
      entity: "profile",
      entityId: id,
      label: profile.email,
      summary: `${mode === "reset" ? "Requested password reset email" : mode === "delete" ? "Deleted customer account; order records retained" : mode === "ban" ? "Banned customer sign-in" : "Restored customer sign-in"}: ${profile.email}`,
      details: { profile_id: id },
    });
  }
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/orders", "layout");
  if (mode === "delete") redirect("/admin/users");
}
