"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSection() {
  return (
    <section className="border-b border-stone-200 bg-emerald-950 px-4 py-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
        Join our newsletter
      </p>
      <h2 className="mx-auto mt-2 max-w-md text-2xl font-bold text-white">
        Special offers & store events
      </h2>
      <form
        className="mx-auto mt-5 flex max-w-md gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <Input
          type="email"
          required
          placeholder="Email address"
          className="border-white/20 bg-white text-stone-900"
        />
        <Button type="submit" variant="gold">
          Join
        </Button>
      </form>
    </section>
  );
}
