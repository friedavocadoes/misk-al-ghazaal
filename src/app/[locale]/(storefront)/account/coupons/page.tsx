import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Gift, Ticket } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";

export default async function AccountCouponsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });

  const session = await requireShopper();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="mt-3 text-sm text-espresso">{t("referralHint")}</p>
        <Link href="/account/login?next=/account/coupons" className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("login")}
        </Link>
      </div>
    );
  }

  const { supabase, user } = session;
  const { data: coupons } = await supabase
    .from("coupons")
    .select("code, kind, amount, used_count, usage_limit, ends_at")
    .eq("owner_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  const rows = (coupons as {
    code: string; kind: string; amount: number; used_count: number;
    usage_limit: number | null; ends_at: string | null;
  }[] | null) ?? [];

  const blurb = (kind: string, amount: number) =>
    kind === "percent"
      ? `${Number(amount)}% off your order`
      : kind === "fixed"
        ? `${formatAED(Number(amount))} off your order`
        : kind === "free_shipping"
          ? "Complimentary delivery"
          : "A gift with your order";

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <Link href="/account" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-fog transition hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("backToAccount")}
      </Link>
      <h1 className="mt-3 font-display text-4xl text-ink">{t("rewardsTitle")}</h1>
      <p className="mt-2 flex max-w-xl items-start gap-2 text-sm leading-relaxed text-espresso">
        <Gift className="mt-0.5 size-4 shrink-0 text-gold" />
        {t("referralText")}
      </p>

      {!rows.length ? (
        <p className="mt-6 border border-dashed border-ink/20 p-8 text-center text-sm text-fog">
          {t("rewardsEmpty")}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const spent = r.usage_limit != null && r.used_count >= r.usage_limit;
            return (
              <li key={r.code} className={`border p-5 ${spent ? "border-ink/10 bg-sand/40 opacity-60" : "border-dashed border-gold/60 bg-cream"}`}>
                <span className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-gold-soft">
                    <Ticket className="size-4" />
                  </span>
                  <span className="font-mono text-lg font-bold tracking-[0.12em] text-ink">{r.code}</span>
                </span>
                <p className="mt-3 text-sm text-espresso">{blurb(r.kind, r.amount)}</p>
                <p className="mt-1 text-[12px] text-fog">
                  {spent ? "Used" : "Ready to use at checkout"}
                  {r.ends_at ? ` · until ${new Date(r.ends_at).toLocaleDateString(locale)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
