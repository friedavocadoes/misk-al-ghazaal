"use client";
import Link from "next/link";
export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-workspace">
      <section className="admin-panel mx-auto mt-16 max-w-lg">
        <p className="eyebrow">Workspace</p>
        <h1 className="mt-3 text-2xl">This page couldn’t load</h1>
        <p className="mt-3 text-sm leading-6 text-fog">
          Your connection or the database may be temporarily unavailable. Retry
          to load the latest saved information.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={reset} className="admin-action">
            Try again
          </button>
          <Link href="/admin" className="admin-action">
            Back to workspace
          </Link>
        </div>
      </section>
    </main>
  );
}
