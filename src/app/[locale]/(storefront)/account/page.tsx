import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Gift, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyCode } from "@/components/ui/copy-code";
import { ShopperSignOut } from "@/components/blocks/ShopperSignOut";
import { createClient } from "@/lib/supabase/server";
import { toLocale } from "@/lib/i18n";

export default async function AccountPage(props: PageProps<"/[locale]/account">) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest: the classic doors.
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="eyebrow text-gold">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-4xl text-ink">{t("title")}</h1>
        <p className="mt-3 text-sm text-espresso">{t("referralHint")}</p>
        <div className="mt-8 flex gap-2">
          <Button asChild className="flex-1">
            <Link href="/account/login">{t("login")}</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/account/register">{t("register")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [{ data: profile }, { data: rewards }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("referral_code, referral_uses").eq("id", user.id).single(),
    supabase
      .from("coupons")
      .select("code, kind, amount")
      .eq("owner_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("order_no, total, status, created_at")
      .or(`user_id.eq.${user.id}${user.email ? `,email.ilike.${user.email}` : ""}`)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const code = (profile as { referral_code?: string } | null)?.referral_code ?? "";
  const uses = (profile as { referral_uses?: number } | null)?.referral_uses ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl text-ink">
          {t("welcome")}
          {user.email ? ` · ${user.email.split("@")[0]}` : ""}
        </h1>
        <ShopperSignOut />
      </div>

      {/* Referral card */}
      <section className="mt-10 border border-gold/40 bg-gold-wash/50 p-6 md:p-8">
        <p className="eyebrow flex items-center gap-2 text-gold">
          <Gift className="size-4" /> {t("referralTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-espresso">{t("referralText")}</p>
        {code ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="border border-dashed border-gold/60 bg-cream px-5 py-2.5 font-mono text-xl font-bold tracking-[0.2em] text-ink">
              {code}
            </span>
            <CopyCode code={code} label={t("copyCode")} copied={t("codeCopied")} />
            <span className="text-[12px] text-fog">
              {uses} {locale === "ar" ? "استخدام" : uses === 1 ? "use" : "uses"}
            </span>
          </div>
        ) : null}
      </section>

      {/* Rewards */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink">{t("rewardsTitle")}</h2>
        {!rewards?.length ? (
          <p className="mt-3 border border-dashed border-ink/20 p-6 text-center text-sm text-fog">
            {t("rewardsEmpty")}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(rewards as { code: string; kind: string; amount: number }[]).map((r) => (
              <li key={r.code} className="flex items-center gap-3 border border-ink/10 bg-white p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-gold-soft">
                  <Ticket className="size-4" />
                </span>
                <span>
                  <span className="block font-mono font-bold tracking-[0.12em] text-ink">{r.code}</span>
                  <span className="text-[13px] text-espresso">
                    {r.kind === "percent" ? `${Number(r.amount)}% off` : `AED ${Number(r.amount)} off`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Orders */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink">{t("ordersTitle")}</h2>
        {!orders?.length ? (
          <p className="mt-3 border border-dashed border-ink/20 p-6 text-center text-sm text-fog">
            {t("ordersEmpty")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
            {(orders as { order_no: string; total: number; status: string; created_at: string }[]).map((o) => (
              <li key={o.order_no} className="flex items-center justify-between gap-4 py-4 text-sm">
                <span>
                  <span className="block font-semibold text-ink">
                    {t("orderNo")} {o.order_no}
                  </span>
                  <span className="text-fog">{new Date(o.created_at).toLocaleDateString(locale)} · {o.status}</span>
                </span>
                <span className="font-display text-lg text-ink">AED {Number(o.total).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
