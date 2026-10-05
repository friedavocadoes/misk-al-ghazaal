import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="eyebrow text-gold">Lost</p>
      <p className="mt-3 font-display text-7xl text-ink">404</p>
      <h1 className="mt-4 font-display text-2xl text-ink">
        This page has evaporated.
      </h1>
      <p className="mt-2 text-sm text-espresso">
        The page you seek does not exist — but our icons endure.
      </p>
      <div className="mt-8 flex justify-center gap-2">
        <Button asChild>
          <Link href="/">Back Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/collection/best-sellers">Best Sellers</Link>
        </Button>
      </div>
    </div>
  );
}
