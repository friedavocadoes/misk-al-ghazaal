import Link from "next/link";
import { Button } from "@/components/ui/button";

// Phase 1 stub — no auth logic. Supabase Auth lands in Phase 2.
export default function AccountPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="eyebrow text-gold">Maison</p>
      <h1 className="mt-3 font-display text-4xl text-ink">My Account</h1>
      <p className="mt-3 text-sm text-espresso">
        Client accounts arrive with Phase 2 and Supabase Auth.
      </p>
      <div className="mt-8 flex gap-2">
        <Button asChild className="flex-1">
          <Link href="/account/login">Login</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/account/register">Register</Link>
        </Button>
      </div>
    </div>
  );
}
