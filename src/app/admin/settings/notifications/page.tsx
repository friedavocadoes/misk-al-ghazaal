import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { getNotificationSettings } from "@/lib/notification-settings";
import { EMAIL_RULES } from "@/lib/notification-rules";
import { logAdmin } from "@/lib/audit";
import { getSiteUrl } from "@/lib/site-url";
async function save(form: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const patch = {
    email_enabled: form.get("email_enabled") === "on",
    email_rules: Object.fromEntries(
      EMAIL_RULES.map((r) => [r.key, form.get(r.key) === "on"]),
    ),
    telegram_new_order: form.get("telegram_new_order") === "on",
    updated_at: new Date().toISOString(),
  };
  const db = createAdminClient(),
    { error } = await db
      .from("notification_settings")
      .update(patch)
      .eq("id", 1)
      .select("id")
      .single();
  if (error)
    throw Error(
      "Could not save notification settings. Apply migration_notification_control.sql.",
    );
  await logAdmin(db, s, {
    category: "emails",
    action: "update",
    entity: "notification_settings",
    summary: "Updated master notification controls",
    details: patch,
  });
  revalidatePath("/admin/settings/notifications");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/[id]", "page");
  revalidatePath("/admin/orders/new");
}
export default async function NotificationSetup() {
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const settings = await getNotificationSettings();
  const { data: telegramAlerts } = await createAdminClient()
    .from("telegram_order_alerts")
    .select("id,order_id,state,error_code,created_at")
    .order("created_at", { ascending: false })
    .limit(15);
  const callback = `${getSiteUrl() || "https://www.miskalghazaalperfumes.com"}/api/whatsapp/webhook`;
  return (
    <>
      <AdminNav email={s.email} role={s.role} />
      <main className="admin-workspace admin-legacy">
        <p className="eyebrow text-gold">Setup</p>
        <h1 className="mt-2 text-3xl font-light">Notifications</h1>
        <p className="mt-3 text-sm leading-7 text-fog">
          Master controls take precedence over individual order checkboxes and
          customer preferences. Disabled email is suppressed at the mailer
          itself, including requests from an already-open admin tab.
        </p>
        {!settings.available && (
          <p role="alert" className="mt-4 bg-red-50 p-4 text-sm text-red-800">
            Apply migration_notification_control.sql. Application email stays
            paused when these settings cannot be read.
          </p>
        )}
        <AdminForm
            action={save}
          success="Notification settings saved"
          className="mt-6 grid gap-5 border border-ink/10 bg-white p-6"
        >
          <label className="flex items-start gap-3 border-b border-ink/10 pb-5">
            <input
              name="email_enabled"
              type="checkbox"
              defaultChecked={settings.email_enabled}
            />
            <span>
              <strong className="block">
                Enable application email sitewide
              </strong>
              <span className="mt-1 block text-xs leading-6 text-fog">
                Turn off to pause every application SMTP message below. Supabase
                authentication messages are managed separately.
              </span>
            </span>
          </label>
          {EMAIL_RULES.map((r) => (
            <label key={r.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                name={r.key}
                defaultChecked={settings.email_rules[r.key]}
              />
              <span>
                <span className="block text-sm font-medium">{r.title}</span>
                <span className="mt-1 block text-xs leading-6 text-fog">
                  {r.description}
                </span>
              </span>
            </label>
          ))}
          <label className="flex items-start gap-3 border-t border-ink/10 pt-5">
            <input
              type="checkbox"
              name="telegram_new_order"
              defaultChecked={settings.telegram_new_order}
            />
            <span>
              <span className="block text-sm font-medium">
                Telegram · new-order staff alerts
              </span>
              <span className="mt-1 block text-xs leading-6 text-fog">
                Notify the configured shop chat at order placement. Requires
                TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID. Independent of customer
                email/WhatsApp.
              </span>
            </span>
          </label>
          {settings.available && <SaveButton>Save master settings</SaveButton>}
        </AdminForm>
        <section className="mt-6 border border-ink/10 bg-white p-6">
          <h2 className="text-lg">Telegram staff alerts</h2>
          <p className="mt-3 text-sm">
            {process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
              ? "Bot token and destination configured"
              : "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to the server environment"}
          </p>
          <div className="mt-4 grid gap-2">
            {telegramAlerts?.map((a) => (
              <p key={a.id} className="flex flex-wrap gap-3 text-xs">
                <a href={`/admin/orders/${a.order_id}`} className="underline">
                  Open order
                </a>
                <span>{a.state}</span>
                {a.error_code && (
                  <span className="text-red-800">{a.error_code}</span>
                )}
              </p>
            ))}
            {!telegramAlerts?.length && (
              <p className="text-xs text-fog">
                New staff alerts will appear here after orders are placed.
              </p>
            )}
          </div>
        </section>
        <section className="mt-6 border border-ink/10 bg-white p-6">
          <h2 className="text-lg">WhatsApp webhook</h2>
          <p className="mt-3 break-all text-sm">
            Callback URL: <code>{callback}</code>
          </p>
          <p className="mt-3 break-all text-sm">
            Verify token:{" "}
            <code>
              {process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
                "Set WHATSAPP_WEBHOOK_VERIFY_TOKEN in the server environment"}
            </code>
          </p>
          <p className="mt-3 text-xs leading-6 text-fog">
            Use the same token in Meta and production. Subscribe to messages.
            POST signatures use WHATSAPP_APP_SECRET; that secret and outbound
            API tokens are never displayed here. No client certificate is
            required by this integration. Publish the app when Meta requires it
            to receive production events.
          </p>
        </section>
        <section className="mt-6 border border-ink/10 bg-white p-6">
          <h2 className="text-lg">
            Authentication email · managed by Supabase
          </h2>
          <p className="mt-3 text-sm leading-7 text-fog">
            Signup verification, email-change verification and password recovery
            use Supabase Auth rather than the application mailer. Configure them
            in Supabase Dashboard → Authentication → Email / Email templates.
            Password reset is a user-requested security operation; disabling
            store notifications does not disable it. Turning off signup
            verification also changes account security, so this panel does not
            silently change that setting.
          </p>
        </section>
      </main>
    </>
  );
}
