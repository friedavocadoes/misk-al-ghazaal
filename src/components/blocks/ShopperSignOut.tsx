"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export function ShopperSignOut({ className }: { className?: string }) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={cn("flex min-h-16 w-full cursor-pointer items-center gap-3.5 bg-white px-4 py-3 text-start text-sm font-semibold text-red-800 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-red-800 disabled:opacity-60 sm:px-5", className)}
      disabled={busy}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true);
        // Device hygiene: the local bag + any applied-code handoff belong
        // to this account — the next login on this browser must start
        // clean instead of inheriting them.
        try {
          localStorage.removeItem("misk-cart-v1");
          localStorage.removeItem("misk-coupon");
        } catch {
          /* private mode */
        }
        await createBrowserClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-red-100 bg-red-50">
        {busy ? <Loader2 aria-hidden className="size-[18px] animate-spin" /> : <LogOut aria-hidden className="size-[18px] rtl:rotate-180" strokeWidth={1.5} />}
      </span>
      {t("signOut")}
    </button>
  );
}
