"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <form
      className="mx-auto max-w-md px-5 py-16"
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="eyebrow text-gold">Maison</p>
      <h1 className="mt-3 font-display text-4xl text-ink">Login</h1>
      <p className="mt-2 text-sm text-fog">Stub only — Supabase Auth in Phase 2.</p>
      <div className="mt-6 grid gap-3">
        <Input placeholder="Email" type="email" required aria-label="Email" />
        <Input placeholder="Password" type="password" required aria-label="Password" />
        <Button type="submit" disabled>
          Sign in
        </Button>
      </div>
    </form>
  );
}
