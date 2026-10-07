"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const t = useTranslations("Account");
  return (
    <form
      className="mx-auto max-w-md px-5 py-16"
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="eyebrow text-gold">{t("eyebrow")}</p>
      <h1 className="mt-3 font-display text-4xl text-ink">{t("login")}</h1>
      <p className="mt-2 text-sm text-fog">{t("loginText")}</p>
      <div className="mt-6 grid gap-3">
        <Input placeholder={t("email")} type="email" required aria-label={t("email")} />
        <Input placeholder={t("password")} type="password" required aria-label={t("password")} />
        <Button type="submit" disabled>
          {t("signIn")}
        </Button>
      </div>
    </form>
  );
}
