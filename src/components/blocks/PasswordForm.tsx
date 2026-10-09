"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

/** Password set/change with confirmation + match validation. Used by the
    logged-in password page and the reset-link landing page. */
export function PasswordForm({ cta }: { cta?: string }) {
  const t = useTranslations("Account");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const match = password.length >= 6 && password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !match) return;
    setBusy(true);
    setError("");
    setDone(false);
    const { error } = await createBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      setPassword("");
      setConfirm("");
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("passwordNew")}
        aria-label={t("passwordNew")}
      />
      <Input
        type="password"
        required
        minLength={6}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={t("passwordConfirm")}
        aria-label={t("passwordConfirm")}
      />
      {confirm && !match && (
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">
          {t("passwordMismatch")}
        </p>
      )}
      {done && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">{t("passwordDone")}</p>}
      {error && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{error}</p>}
      <Button type="submit" disabled={busy || !match}>
        {cta ?? t("passwordSave")}
      </Button>
    </form>
  );
}
