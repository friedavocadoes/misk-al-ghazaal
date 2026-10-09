import { cn } from "@/lib/utils";

/** Shopper avatar: photo when present, gold initial disc otherwise. */
export function ShopperAvatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name: string;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn("rounded-full object-cover", className ?? "size-10")} />;
  }
  const initial = (name.trim().charAt(0) || "·").toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-full bg-ink font-display italic text-gold-soft",
        className ?? "size-10 text-lg",
      )}
    >
      {initial}
    </span>
  );
}
