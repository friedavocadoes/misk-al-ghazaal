export default function BannersLoading() {
  return (
    <div
      className="admin-workspace"
      aria-busy="true"
      aria-label="Loading banners"
    >
      <div className="mb-8 h-10 w-48 animate-pulse rounded bg-ink/10" />
      <div className="mb-8 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((n) => (
          <div key={n} className="h-24 animate-pulse rounded-xl bg-ink/5" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="h-28 animate-pulse rounded-xl bg-ink/5" />
        ))}
      </div>
    </div>
  );
}
