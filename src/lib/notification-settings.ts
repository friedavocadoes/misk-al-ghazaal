import "server-only";
import { createAdminClient } from "./supabase/service";
import {
  EMAIL_RULES,
  mailAllowed,
  type EmailRule,
  type NotificationSettings,
} from "./notification-rules";
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const off = {
    email_enabled: false,
    email_rules: Object.fromEntries(
      EMAIL_RULES.map((r) => [r.key, false]),
    ) as Record<EmailRule, boolean>,
    telegram_new_order: false,
    available: false,
  };
  try {
    const { data, error } = await createAdminClient()
      .from("notification_settings")
      .select("email_enabled,email_rules,telegram_new_order")
      .eq("id", 1)
      .single();
    if (error || !data) return off;
    return {
      email_enabled: data.email_enabled === true,
      email_rules: Object.fromEntries(
        EMAIL_RULES.map((r) => [r.key, data.email_rules?.[r.key] === true]),
      ) as Record<EmailRule, boolean>,
      telegram_new_order: data.telegram_new_order === true,
      available: true,
    };
  } catch {
    return off;
  }
}
export async function systemEmailAllowed(kind: EmailRule) {
  return mailAllowed(await getNotificationSettings(), kind);
}
