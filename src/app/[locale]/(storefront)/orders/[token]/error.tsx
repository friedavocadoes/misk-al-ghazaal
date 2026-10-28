"use client";
export default function OrderError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="order-passport">
      <p className="eyebrow">Your order</p>
      <h1>Updates are temporarily unavailable.</h1>
      <p className="mt-5 text-sm text-fog">
        Your order has not changed. Please retry in a moment.
      </p>
      <button onClick={reset} className="order-primary-link mt-6">
        Try again
      </button>
    </main>
  );
}
