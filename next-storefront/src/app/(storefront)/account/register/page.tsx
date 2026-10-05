"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <form
      className="mx-auto max-w-md px-4 py-12"
      onSubmit={(e) => e.preventDefault()}
    >
      <h1 className="text-2xl font-bold">Register</h1>
      <p className="mt-1 text-sm text-stone-500">Stub only — Supabase Auth in Phase 2.</p>
      <div className="mt-5 grid gap-3">
        <Input placeholder="Full name" />
        <Input placeholder="Email" type="email" required />
        <Input placeholder="Password" type="password" required />
        <Button type="submit" disabled>
          Create account (Phase 2)
        </Button>
      </div>
    </form>
  );
}
