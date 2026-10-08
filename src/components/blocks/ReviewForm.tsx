"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Login-gated review form: pending-moderation note on success. */
export function ReviewForm({ productId }: { productId: string; productSlug: string; locale: string }) {
  const t = useTranslations("Product");
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        setUser(data.user ? { id: data.user.id } : null);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-start gap-4 border border-ink/10 bg-sand/50 p-6 sm:flex-row sm:items-center">
        <p className="font-display text-xl text-ink">{t("reviewLoginTitle")}</p>
        <Button asChild className="sm:ms-auto">
          <Link href="/account/login">{t("reviewLoginCta")}</Link>
        </Button>
      </div>
    );
  }

  if (sent) {
    return (
      <p className="border border-[#1e7a46]/40 bg-[#1e7a46]/[0.07] p-6 text-center text-sm text-ink">
        {t("reviewPending")}
      </p>
    );
  }

  const submit = async () => {
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title, body }),
    });
    if (res.ok) setSent(true);
    else setError(t("reviewError"));
  };

  return (
    <div className="border border-ink/10 p-6 md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">{t("reviewStars")}</p>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} / 5`} className="p-0.5">
            <Star className={cn("size-8 transition", n <= rating ? "fill-gold text-gold" : "text-ink/20 hover:text-gold")} />
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("reviewTitlePh")}
          maxLength={80}
          className="w-full rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-gold focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("reviewBodyPh")}
          rows={4}
          maxLength={2000}
          className="w-full rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-gold focus:outline-none"
        />
      </div>
      {error && <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9c2b2e]">{error}</p>}
      <Button onClick={submit} className="mt-5">
        {t("reviewSubmit")}
      </Button>
    </div>
  );
}
