import { WhatsAppPreferences } from "@/components/account/WhatsAppPreferences";
import { createAdminClient } from "@/lib/supabase/service";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";
import { NotificationsForm } from "./notifications-form";

export default async function AccountNotificationsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);

  const session = await requireShopper();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <Link
          href="/account/login?next=/account/notifications"
          className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
        >
          {locale === "ar" ? "تسجيل الدخول" : "Login"}
        </Link>
      </div>
    );
  }

  const { supabase, user } = session;
  const { data: profile } = await supabase
    .from("profiles")
    .select("promo_opt_in, order_updates_opt_in")
    .eq("id", user.id)
    .single();
  const p = (profile as { promo_opt_in?: boolean | null; order_updates_opt_in?: boolean | null } | null) ?? {};
  const ar = locale === "ar";
  const db=createAdminClient();
  const {data:waAccount}=await db.from("whatsapp_accounts").select("phone").eq("user_id",user.id).maybeSingle();
  const {data:wa}=waAccount?.phone ? await db.from("whatsapp_contacts").select("orders_opt_in,marketing_opt_in,stopped_at").eq("phone",waAccount.phone).maybeSingle() : {data:null};

  return (
    <div className="mx-auto max-w-xl px-5 py-12 md:px-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-fog transition hover:text-ink"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" /> {ar ? "الحساب" : "Account"}
      </Link>
      <p className="eyebrow mt-3 text-gold">{ar ? "الإعدادات" : "Settings"}</p>
      <h1 className="mt-2 font-display text-4xl text-ink">
        {ar ? "تفضيلات الإشعارات" : "Notification preferences"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-espresso">
        {ar
          ? "هذه المفاتيح حقيقية — إيقاف أي منها يوقف رسائله فعلاً."
          : "These switches are real — turning one off actually stops its mails."}
      </p>

      <div className="mt-6 border border-ink/10 bg-white p-6 md:p-8">
        <NotificationsForm
          initialOrder={p.order_updates_opt_in !== false}
          initialPromo={p.promo_opt_in !== false}
          accountEmail={user.email ?? ""}
          labels={
            ar
              ? {
                  orderTitle: "تحديثات الطلبات",
                  orderText: "رسائل تأكيد الطلب والشحن والتتبع ضرورية ولا يمكن إيقافها.",
                  promoTitle: "العروض والوصلات الجديدة",
                  promoText: "رسائل خاصة من الدار، مرة بالشهر غالباً — وليست أبداً إزعاجاً.",
                  save: "حفظ",
                  saving: "يُحفظ…",
                  saved: "تم الحفظ ✓",
                  to: "تُرسل الرسائل إلى",
                }
              : {
                  orderTitle: "Order updates",
                  orderText: "Essential confirmation, delivery and tracking emails cannot be disabled.",
                  promoTitle: "Private offers & new arrivals",
                  promoText: "Be the first to know about new arrivals directly from the maison",
                  save: "Save",
                  saving: "Saving…",
                  saved: "Saved ✓",
                  to: "Mails go to",
                }
          }
        />
      </div>
      <WhatsAppPreferences initialPhone={waAccount?.phone ? `+${waAccount.phone}` : ""} initialOrders={!!wa?.orders_opt_in && !wa.stopped_at} initialMarketing={!!wa?.marketing_opt_in && !wa.stopped_at} ar={ar}/>
    </div>
  );
}
