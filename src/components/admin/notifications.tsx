"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Package,
  Mail,
  Star,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  ADMIN_ATTENTION_EVENT,
  notifyAdminAttentionChanged,
  EMPTY_ATTENTION,
  badgeCount,
  type AttentionFeed,
  type AttentionKind,
} from "@/lib/admin-attention";
const CHANGED = ADMIN_ATTENTION_EVENT;
export async function setAttentionRead(
  kind: AttentionKind,
  id: string,
  read: boolean,
) {
  const response = await fetch("/api/admin/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id, read }),
    keepalive: true,
  });
  if (!response.ok)
    throw new Error("Could not update read state. Please try again.");
  notifyAdminAttentionChanged();
}
const AttentionContext = createContext<{
  feed: AttentionFeed;
  error: string;
  refresh: () => void;
}>({ feed: EMPTY_ATTENTION, error: "", refresh: () => {} });
export function AdminAttentionProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [feed, setFeed] = useState(EMPTY_ATTENTION),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (!enabled || document.visibilityState !== "visible") return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await fetch("/api/admin/notifications", {
        cache: "no-store",
        signal: request.signal,
      });
      if(response.status===401||response.status===403){if(mounted.current&&!request.signal.aborted){setFeed(EMPTY_ATTENTION);setError("Your workspace session needs to be refreshed.");}return;}
      if (!response.ok) throw Error("Notifications couldn’t refresh.");
      const next = await response.json();
      if (mounted.current && !request.signal.aborted) {
        setFeed(next);
        setError("");
      }
    } catch (error) {
      if (mounted.current && !request.signal.aborted)
        setError(
          error instanceof Error ? error.message : "Notifications unavailable",
        );
    }
  }, [enabled]);
  useEffect(() => {
    mounted.current = true;
    if (!enabled)
      return () => {
        mounted.current = false;
      };
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 15000);
    const changed = () => void refresh();
    const storage = (event: StorageEvent) => {
      if (event.key === CHANGED) void refresh();
    };
    window.addEventListener("storage", storage);
    window.addEventListener(CHANGED, changed);
    window.addEventListener("focus", changed);
    document.addEventListener("visibilitychange", changed);
    return () => {
      mounted.current = false;
      controller.current?.abort();
      clearInterval(timer);
      clearTimeout(initial);
      window.removeEventListener("storage", storage);
      window.removeEventListener(CHANGED, changed);
      window.removeEventListener("focus", changed);
      document.removeEventListener("visibilitychange", changed);
    };
  }, [enabled, refresh]);
  return (
    <AttentionContext.Provider value={{ feed:enabled?feed:EMPTY_ATTENTION, error:enabled?error:"", refresh }}>
      {children}
    </AttentionContext.Provider>
  );
}
export function useAdminAttention() {
  return useContext(AttentionContext);
}
export function AttentionBadge({ count }: { count: number }) {
  return count > 0 ? (
    <span className="admin-attention-badge" aria-label={`${count} unread`}>
      {badgeCount(count)}
    </span>
  ) : null;
}
export function AdminNotificationMenu() {
  const { feed, error, refresh } = useAdminAttention();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const align = useCallback(() => {
    if (!root.current || !trigger.current) return;
    const button = trigger.current.getBoundingClientRect(),
      header = trigger.current.closest("header")?.getBoundingClientRect();
    const bottom = Math.max(button.bottom, header?.bottom ?? button.bottom);
    root.current.style.setProperty("--notification-top", `${bottom + 8}px`);
    root.current.style.setProperty(
      "--notification-gap",
      `${bottom - button.bottom + 8}px`,
    );
  }, []);
  useEffect(() => {
    if (!open) return;
    align();
    window.addEventListener("resize", align);
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", align);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, align]);
  const icons = { order: Package, contact: Mail, review: Star };
  return (
    <div ref={root} className="admin-notification-root">
      <button
        ref={trigger}
        type="button"
        aria-label={`Notifications${feed.counts.total ? `, ${feed.counts.total} unread` : ""}`}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        onClick={() => {
          align();
          setOpen((v) => !v);
          refresh();
        }}
        className="admin-notification-trigger"
      >
        <Bell size={18} strokeWidth={1.5} />
        {feed.counts.total > 0 && <span className="admin-notification-dot" />}
      </button>
      {open && (
        <section
          id="admin-notification-panel"
          aria-label="Notifications"
          className="admin-notification-panel"
        >
          <header>
            <div>
              <p>Notifications</p>
              <span>{error?"Updates temporarily unavailable":`${feed.counts.total} unread · Your workspace`}</span>
            </div>
            <button
              type="button"
              aria-label="Refresh notifications"
              onClick={refresh}
            >
              <RefreshCw size={14} />
            </button>
          </header>
          {error && (
            <p role="status" className="admin-notification-error">
              {error} <button onClick={refresh}>Retry</button>
            </p>
          )}
          <div className="admin-notification-items">
            {feed.items.map((item) => {
              const Icon = icons[item.kind];
              return (
                <Link
                  key={`${item.kind}:${item.id}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="admin-notification-item"
                >
                  <span className={`admin-notification-icon is-${item.kind}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <time dateTime={item.created_at}>
                      {new Intl.DateTimeFormat("en-GB", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Dubai",
                      }).format(new Date(item.created_at))}
                    </time>
                  </span>
                  <ArrowUpRight size={13} />
                </Link>
              );
            })}
            {!feed.items.length && !error && (
              <div className="admin-notification-empty">
                <Bell size={23} strokeWidth={1} />
                <p>You’re all caught up.</p>
                <span>New orders, enquiries and reviews will appear here.</span>
              </div>
            )}
          </div>
          <footer>
            <Link href="/admin/orders">Orders</Link>
            <Link href="/admin/inbox">Contact inbox</Link>
          </footer>
        </section>
      )}
    </div>
  );
}
export function AttentionReadState({
  kind,
  id,
  initialRead = false,
  showControl = true,
  autoRead = true,
  refreshPage = false,
}: {
  kind: AttentionKind;
  id: string;
  initialRead?: boolean;
  showControl?: boolean;
  autoRead?: boolean;
  refreshPage?: boolean;
}) {
  const router = useRouter();
  const [read, setRead] = useState(initialRead),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const acted = useRef(initialRead);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!autoRead) return;
    let alive = true;
    const auto = () => {
      if (
        acted.current ||
        timer.current ||
        document.visibilityState !== "visible"
      )
        return;
      timer.current = setTimeout(() => {
        timer.current = null;
        if (!alive || acted.current || document.visibilityState !== "visible")
          return;
        acted.current = true;
        void setAttentionRead(kind, id, true)
          .then(() => {
            if (alive) setRead(true);
          })
          .catch(() => {
            if (alive) setError("Read state could not be saved.");
          });
      }, 400);
    };
    auto();
    document.addEventListener("visibilitychange", auto);
    return () => {
      alive = false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      document.removeEventListener("visibilitychange", auto);
    };
  }, [id, kind, autoRead]);
  if (!showControl) return null;
  return (
    <div>
      <button
        type="button"
        className="admin-action"
        disabled={pending}
        onClick={async () => {
          acted.current = true;
          if (timer.current) clearTimeout(timer.current);
          setPending(true);
          setError("");
          try {
            await setAttentionRead(kind, id, !read);
            setRead(!read);
            if (refreshPage) router.refresh();
          } catch (error) {
            setError(error instanceof Error ? error.message : "Try again");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : read ? (
          <EyeOff size={14} />
        ) : (
          <Eye size={14} />
        )}
        Mark as {read ? "unread" : "read"}
      </button>
      {error && (
        <p role="status" className="mt-2 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
