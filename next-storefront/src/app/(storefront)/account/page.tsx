"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Phase 1 stubs only — no auth logic. Supabase Auth lands in Phase 2.
export default function AccountPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">My Account</h1>
      <p className="mt-2 text-sm text-stone-500">
        Accounts arrive in Phase 2 with Supabase Auth.
      </p>
      <div className="mt-6 flex gap-2">
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

export function AccountForm({ mode }: { mode: "login" | "register" }) {
  return (
    <form
      className="mx-auto max-w-md px-4 py-12"
      onSubmit={(e) => e.preventDefault()}
    >
      <h1 className="text-2xl font-bold capitalize">{mode}</h1>
      <div className="mt-5 grid gap-3">
        <Input placeholder="Email" type="email" required />
        <Input placeholder="Password" type="password" required />
        {mode === "register" && <Input placeholder="Full name" />}
        <Button type="submit" disabled>
          {mode === "login" ? "Sign in (Phase 2)" : "Create account (Phase 2)"}
        </Button>
      </div>
    </form>
  );
}
