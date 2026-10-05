import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-bold text-emerald-950">404</p>
      <h1 className="mt-4 text-2xl font-bold">UH OH! You&apos;re lost.</h1>
      <p className="mt-2 text-sm text-stone-500">
        The page you are looking for does not exist. But our best sellers do.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
