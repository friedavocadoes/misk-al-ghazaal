import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Pagination({
  page,
  totalPages,
  baseUrl,
  param = "page",
}: {
  page: number;
  totalPages: number;
  baseUrl: string;
  param?: string;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) =>
    `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${param}=${p}`;
  return (
    <nav className="flex items-center justify-center gap-2 pt-8" aria-label="Pagination">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Button
          key={p}
          asChild
          variant={p === page ? "default" : "outline"}
          size="sm"
          className={cn(p === page && "pointer-events-none")}
        >
          <Link href={href(p)} aria-current={p === page ? "page" : undefined}>
            {p}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
