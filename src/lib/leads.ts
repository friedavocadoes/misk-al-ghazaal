import "server-only";
import { createAdminClient } from "./supabase/service";
import { getSiteUrl } from "./site-url";
export const LEAD_SOURCES = [
  "account",
  "guest_order",
  "newsletter",
  "manual",
] as const;
export function validPreferenceToken(token: string) {
  return /^[a-f0-9]{64}$/.test(token);
}
export async function getEmailCommunicationLink(email: string) {
  const db = createAdminClient(),
    { data, error } = await db
      .from("customer_leads")
      .select("preference_token,marketing_email,unsubscribed_at")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
  if (error || !data) return null;
  const origin = getSiteUrl();
  if (!/^https?:\/\//.test(origin)) return null;
  return {
    url: `${origin}/preferences/${data.preference_token}`,
    unsubscribeUrl: `${origin}/api/preferences/${data.preference_token}/unsubscribe`,
    marketing: data.marketing_email === true && !data.unsubscribed_at,
  };
}
export async function getCommunicationPreferences(token: string) {
  if (!validPreferenceToken(token)) return null;
  const db = createAdminClient(),
    { data: l, error } = await db
      .from("admin_lead_channels")
      .select("email,phone,marketing_email,wa_phone,wa_orders,wa_promotions")
      .eq("preference_token", token)
      .maybeSingle();
  if (error) return null;
  if (!l) {
    const { data: wa } = await db
      .from("whatsapp_contacts")
      .select("phone,orders_opt_in,marketing_opt_in,stopped_at")
      .eq("preference_token", token)
      .maybeSingle();
    if (!wa) return null;
    return {
      email: "WhatsApp",
      emailAvailable: false,
      emailPromo: false,
      phone: `+${wa.phone.slice(0, 3)} •••• ${wa.phone.slice(-4)}`,
      waOrders: wa.orders_opt_in && !wa.stopped_at,
      waPromo: wa.marketing_opt_in && !wa.stopped_at,
    };
  }
  return {
    email: l.email,
    emailAvailable: true,
    emailPromo: l.marketing_email === true,
    phone: l.wa_phone
      ? `+${l.wa_phone.slice(0, 3)} •••• ${l.wa_phone.slice(-4)}`
      : null,
    waOrders: l.wa_orders,
    waPromo: l.wa_promotions,
  };
}
