import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { requireShopper } from "@/lib/shopper";
import { displayName } from "@/lib/shopper-identity";
import { toLocale } from "@/lib/i18n";
import { SettingsForm } from "./settings-form";

export default async function AccountSettingsPage(props: {
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
          href="/account/login?next=/account/settings"
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
    .select("full_name, phone")
    .eq("id", user.id)
    .single();
  const p = (profile as { full_name?: string | null; phone?: string | null } | null) ?? {};
  const ar = locale === "ar";

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
        {ar ? "البيانات الشخصية" : "Personal details"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-espresso">
        {ar
          ? "اسمك هنا هو اسمك في كل مكان — الترويسة، الطلبات، ورسائلنا لك."
          : "Your name here is your name everywhere — the header, your orders, our mails to you."}
      </p>

      <div className="mt-6 border border-ink/10 bg-white p-6 md:p-8">
        <SettingsForm
          initialName={p.full_name || displayName(user)}
          initialPhone={p.phone || ""}
          labels={
            ar
              ? {
                  name: "الاسم الكامل",
                  nameHint: "اكتب اسمك كما تحب أن نناديك",
                  phone: "رقم الهاتف",
                  phoneHint: "اختر رمز البلد ثم اكتب رقمك بدون الصفر الأول.",
                  code: "رمز البلد",
                  save: "حفظ",
                  saving: "يُحفظ…",
                  saved: "تم الحفظ ✓",
                }
              : {
                  name: "Full name",
                  nameHint: "Type your name as you'd like us to address you",
                  phone: "Mobile number",
                  phoneHint: "Pick your country code, then type your number without the leading zero.",
                  code: "Country code",
                  save: "Save",
                  saving: "Saving…",
                  saved: "Saved ✓",
                }
          }
        />
      </div>
    </div>
  );
}
