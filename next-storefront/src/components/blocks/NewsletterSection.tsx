"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSection() {
  return (
    <section className="border-b border-ink/10 px-5 py-14 text-center">
      <p className="eyebrow text-gold">Correspondence</p>
      <h2 className="mx-auto mt-3 max-w-md font-display text-3xl text-ink md:text-4xl">
        Letters from the Maison
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-espresso">
        Private offers, new arrivals and rituals — once a month, never more.
      </p>
      <form
        className="mx-auto mt-6 flex max-w-md gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <Input
          type="email"
          required
          placeholder="Email address"
          className="h-12 bg-white"
          aria-label="Email address"
        />
        <Button type="submit" className="h-12 shrink-0">
          Join
        </Button>
      </form>
    </section>
  );
}
