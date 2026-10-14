"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="border border-ink/20 px-4 py-2 text-sm transition hover:border-ink/50 hover:bg-white"
      onClick={async () => {
        const supabase = createClient();
        try {
          await fetch("/api/admin/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "logout" }),
          });
        } catch {
          /* audit must never block sign-out */
        }
        await supabase.auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
