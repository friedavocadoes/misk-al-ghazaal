export const EMAIL_RULES = [
  {
    key: "welcome",
    title: "New-account welcome",
    description:
      "The branded welcome email after email or Google account creation.",
  },
  {
    key: "order_updates",
    title: "Order confirmations & updates",
    description:
      "Customer emails selected by staff on confirmation, tracking or later status changes. No email is sent at checkout.",
  },
  {
    key: "contact_alerts",
    title: "Contact inbox alerts",
    description:
      "Email the shop when a customer submits the contact form. The inbox message is saved either way.",
  },
  {
    key: "order_support",
    title: "Order-support forwards",
    description:
      "Forward an account customer's delivery, cancellation or support request to the support mailbox.",
  },
  {
    key: "promotions",
    title: "Promotional email campaigns",
    description:
      "The existing opted-in email campaigns. WhatsApp promotion development is paused.",
  },
] as const;
export type EmailRule = (typeof EMAIL_RULES)[number]["key"];
export interface NotificationSettings {
  email_enabled: boolean;
  email_rules: Record<EmailRule, boolean>;
  telegram_new_order: boolean;
  available: boolean;
}
export const NOTIFICATION_SETTINGS_PATH = "/admin/settings/notifications";
export const DISABLED_EMAIL_HINT = `System mail is disabled. Enable it in Admin → Setup → Notifications → Order confirmations & updates (${NOTIFICATION_SETTINGS_PATH}).`;
export function mailAllowed(settings: NotificationSettings, kind: EmailRule) {
  return (
    settings.available &&
    settings.email_enabled &&
    settings.email_rules[kind] === true
  );
}
