// Segment skeleton: streams instantly inside the storefront layout while
// the next page loads, so navigation never stares at a frozen old page.
export default function StorefrontLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-5 py-12 md:px-8" aria-hidden>
      <div className="mx-auto h-3 w-40 bg-ink/10" />
      <div className="mx-auto mt-5 h-9 w-72 max-w-full bg-ink/10" />
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="aspect-square bg-sand" />
        <div className="space-y-4">
          <div className="h-4 w-32 bg-ink/10" />
          <div className="h-10 w-3/4 bg-ink/10" />
          <div className="h-6 w-40 bg-ink/10" />
          <div className="h-13 w-full bg-ink py-7" />
          <div className="h-13 w-full border border-ink/10 py-7" />
        </div>
      </div>
    </div>
  );
}
