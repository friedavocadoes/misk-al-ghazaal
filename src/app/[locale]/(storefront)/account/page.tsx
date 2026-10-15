import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Gift, KeyRound, Mail, Package, Ticket, UserRound } from "lucide-react";
import { AuthTabs } from "@/components/blocks/AuthTabs";
import { CopyCode } from "@/components/ui/copy-code";
import { AvatarUploader } from "@/components/blocks/AvatarUploader";
import { GoogleGlyph } from "@/components/ui/brand-icons";
import { ShopperSignOut } from "@/components/blocks/ShopperSignOut";
import { avatarOf, displayName, providerOf } from "@/lib/shopper-identity";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";

export default async function AccountPage(
  props: PageProps<"/[locale]/account">,
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });

  const session = await requireShopper();

  // Guest: straight to the form — login + register live as tabs.
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <p className="eyebrow text-center text-gold">{t("eyebrow")}</p>
        <h1 className="mt-3 text-center font-display text-4xl text-ink">
          {t("title")}
        </h1>
        <p className="mt-3 text-center text-sm text-espresso">
          {t("referralHint")}
        </p>
        <div className="mt-8">
          <Suspense>
            <AuthTabs defaultTab="login" />
          </Suspense>
        </div>
      </div>
    );
  }

  const { supabase, user } = session;
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "referral_code, referral_uses, avatar_url, role, full_name, phone, promo_opt_in, order_updates_opt_in",
    )
    .eq("id", user.id)
    .single();

  const code =
    (profile as { referral_code?: string } | null)?.referral_code ?? "";
  const uses =
    (profile as { referral_uses?: number } | null)?.referral_uses ?? 0;
  const storedName =
    (profile as { full_name?: string | null } | null)?.full_name ?? "";
  const storedPhone =
    (profile as { phone?: string | null } | null)?.phone ?? "";
  const promoOn =
    (profile as { promo_opt_in?: boolean | null } | null)?.promo_opt_in !==
    false;
  const orderMailOn =
    (profile as { order_updates_opt_in?: boolean | null } | null)
      ?.order_updates_opt_in !== false;
  const name = storedName || displayName(user);
  const avatar = avatarOf(
    user,
    profile as { avatar_url?: string | null } | null,
  );
  const provider = providerOf(user);
  const staff = ["super_admin", "orders"].includes(
    (profile as { role?: string } | null)?.role ?? "",
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl text-ink">
          {t("welcome")}
          {name ? ` · ${name}` : ""}
        </h1>
        <ShopperSignOut />
      </div>

      {/* Profile — maison member card */}
      <section className="relative mt-10 overflow-hidden border border-gold/30 bg-white">
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-2 select-none font-display text-[11rem] italic leading-none text-gold/10"
        >
          {(name.trim().charAt(0) || "·").toUpperCase()}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-2 border border-gold/20"
        />
        <div className="relative flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:text-left md:p-8">
          <AvatarUploader userId={user.id} name={name} initial={avatar} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-gold">{t("memberCard")}</p>
            <p className="mt-2 font-display text-3xl leading-tight text-ink md:text-4xl">
              {name || "—"}
            </p>
            <p className="mt-1.5 truncate text-sm text-fog" dir="ltr">
              {user.email ?? "—"}
            </p>
            {storedPhone && (
              <p className="mt-1 truncate text-sm text-fog" dir="ltr">
                {storedPhone}
              </p>
            )}
            <p className="mt-1 text-[12px] text-fog/80">
              {t("loggedInWith")}{" "}
              {provider === "google" ? (
                <GoogleGlyph className="inline size-3.5 align-[-2px]" />
              ) : (
                t("providerEmail")
              )}
            </p>
          </div>
        </div>
        {provider === "email" && (
          <div className="relative mx-6 mb-6 md:mx-8 md:mb-8">
            <Link
              href="/account/password"
              className="group flex items-center gap-4 border border-ink/10 bg-cream/60 p-4 transition hover:border-gold/60"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-ink text-gold-soft">
                <KeyRound className="size-4" />
              </span>
              <span className="font-display text-lg text-ink transition group-hover:text-gold">
                {t("changePassword")}
              </span>
              <span
                aria-hidden
                className="ms-auto text-gold opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100 rtl:rotate-180"
              >
                →
              </span>
            </Link>
          </div>
        )}
      </section>

      {/* Doors to orders + rewards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="group flex items-center gap-4 border border-ink/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold/60"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-ink text-gold-soft">
            <Package className="size-5" strokeWidth={1.5} />
          </span>
          <span className="font-display text-xl text-ink transition group-hover:text-gold">
            {t("ordersTitle")}
          </span>
        </Link>
        <Link
          href="/account/coupons"
          className="group flex items-center gap-4 border border-ink/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold/60"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-ink text-gold-soft">
            <Ticket className="size-5" strokeWidth={1.5} />
          </span>
          <span className="font-display text-xl text-ink transition group-hover:text-gold">
            {t("rewardsTitle")}
          </span>
        </Link>
      </div>

      {/* Referral card */}
      <section className="mt-6 border border-gold/40 bg-gold-wash/50 p-6 md:p-8">
        <p className="eyebrow flex items-center gap-2 text-gold">
          <Gift className="size-4" /> {t("referralTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-espresso">
          {t("referralText")}
        </p>
        {code ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="border border-dashed border-gold/60 bg-cream px-5 py-2.5 font-mono text-xl font-bold tracking-[0.2em] text-ink">
              {code}
            </span>
            <CopyCode
              code={code}
              label={t("copyCode")}
              copied={t("codeCopied")}
            />
            <span className="text-[12px] text-fog">
              {uses} {locale === "ar" ? "استخدام" : uses === 1 ? "use" : "uses"}
            </span>
          </div>
        ) : null}
      </section>

      {/* Settings — personal details + email preferences live behind
          these doors (with live summaries), not as open forms. */}
      <section
        className="mt-6 border border-ink/10 bg-white"
        aria-label={locale === "ar" ? "الإعدادات" : "Settings"}
      >
        <Link
          href="/account/settings"
          className="group flex items-center gap-4 border-b border-ink/10 p-5 transition hover:bg-cream/60"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-gold-soft">
            <UserRound className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl text-ink transition group-hover:text-gold">
              {locale === "ar" ? "البيانات الشخصية" : "Personal details"}
            </span>
            <span
              className="mt-0.5 block truncate text-[13px] text-fog"
              dir="ltr"
            >
              {storedPhone ? `${name} · ${storedPhone}` : name}
            </span>
          </span>
          <span
            aria-hidden
            className="text-gold transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
          >
            →
          </span>
        </Link>
        <Link
          href="/account/notifications"
          className="group flex items-center gap-4 p-5 transition hover:bg-cream/60"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-gold-soft">
            <Mail className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl text-ink transition group-hover:text-gold">
              {locale === "ar" ? "تفضيلات البريد" : "Email preferences"}
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-fog">
              {locale === "ar"
                ? `الطلبات ${orderMailOn ? "مفعّلة" : "متوقفة"} · العروض ${promoOn ? "مفعّلة" : "متوقفة"}`
                : `Orders ${orderMailOn ? "on" : "off"} · Offers ${promoOn ? "on" : "off"}`}
            </span>
          </span>
          <span
            aria-hidden
            className="text-gold transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
          >
            →
          </span>
        </Link>
      </section>

      <a
        href="mailto:support@miskalghazaalperfumes.com"
        className="mt-3 block border border-ink/10 bg-white p-5 text-sm transition hover:border-gold/60"
      >
        <span className="block font-display text-xl text-ink">
          {locale === "ar" ? "شكوى أو اقتراح؟" : "Complaints & support"}
        </span>
        <span className="mt-1 block text-espresso" dir="ltr">
          support@miskalghazaalperfumes.com
        </span>
        <span className="mt-0.5 block text-[13px] text-fog">
          {locale === "ar"
            ? "راسلنا مباشرة — نرد خلال ٢٤ ساعة."
            : "Write to us directly — we usually reply within 24 hours."}
        </span>
      </a>
      {staff && (
        <NextLink
          href="/admin"
          className="group mt-3 flex items-center gap-4 border border-gold/50 bg-gold-wash/50 p-5 transition hover:-translate-y-0.5 hover:border-gold"
        >
          <span className="font-display text-xl text-ink transition group-hover:text-gold">
            {locale === "ar" ? "لوحة الإدارة" : "Open admin panel"}
          </span>
          <span
            aria-hidden
            className="ms-auto text-gold opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100 rtl:rotate-180"
          >
            →
          </span>
        </NextLink>
      )}
    </div>
  );
}
