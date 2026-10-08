"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Toasts: fire `toast("Saved", "ok")` from anywhere; <Toaster/> renders.
// ---------------------------------------------------------------------------
export type ToastTone = "ok" | "bad";

export function toast(message: string, tone: ToastTone = "ok"): void {
  window.dispatchEvent(new CustomEvent("admin-toast", { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; tone: ToastTone }[]>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent).detail as { message: string; tone: ToastTone };
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3200);
    };
    window.addEventListener("admin-toast", onToast);
    return () => window.removeEventListener("admin-toast", onToast);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((i) => (
        <p
          key={i.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 border px-5 py-3 text-sm font-medium shadow-[0_16px_40px_-16px_rgba(28,25,23,0.5)]",
            i.tone === "ok" ? "border-ink bg-ink text-white" : "border-[#9c2b2e] bg-[#9c2b2e] text-white",
          )}
        >
          {i.tone === "ok" ? <Check className="size-4 text-gold-soft" /> : <X className="size-4" />}
          {i.message}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminForm: wraps a server action with dirty-tracking + result toasts.
// Save buttons inside stay disabled until something actually changed, and
// show a spinner while the action runs (double-submit impossible).
// ---------------------------------------------------------------------------
interface FormState {
  dirty: boolean;
  pending: boolean;
}

const FormCtx = createContext<FormState>({ dirty: false, pending: false });

function serialize(form: HTMLFormElement): string {
  return new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
}

export function AdminForm({
  action,
  success = "Saved",
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  success?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const initial = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [state, formAction] = useActionState(
    async (_prev: { ok: boolean; message: string } | null, fd: FormData) => {
      try {
        await action(fd);
      } catch (e) {
        // redirect() throws to navigate — let it through, never toast it.
        if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
        return { ok: false as boolean, message: e instanceof Error ? e.message : "Save failed" };
      }
      // Success: re-baseline so further untouched submits stay disabled.
      // (setState here is an event context, not an effect.)
      if (formRef.current) initial.current = serialize(formRef.current);
      setDirty(false);
      return { ok: true as boolean, message: success };
    },
    null as null | { ok: boolean; message: string },
  );

  useEffect(() => {
    if (formRef.current && initial.current === null) {
      initial.current = serialize(formRef.current);
    }
  }, []);

  useEffect(() => {
    if (state) toast(state.message, state.ok ? "ok" : "bad");
  }, [state]);

  const onChange = useCallback(() => {
    if (!formRef.current || initial.current === null) return;
    setDirty(serialize(formRef.current) !== initial.current);
  }, []);

  return (
    <form ref={formRef} action={formAction} onChange={onChange} onInput={onChange} className={className}>
      <PendingBridge dirty={dirty}>{children}</PendingBridge>
    </form>
  );
}

function PendingBridge({ dirty, children }: { dirty: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <FormCtx.Provider value={{ dirty, pending }}>{children}</FormCtx.Provider>;
}

export function useAdminForm(): FormState {
  return useContext(FormCtx);
}

/** Drop-in save button: disabled until dirty, spinner while saving. */
export function SaveButton({
  children = "Save",
  className,
  danger,
}: {
  children?: React.ReactNode;
  className?: string;
  danger?: boolean;
}) {
  const { dirty, pending } = useAdminForm();
  return (
    <button
      type="submit"
      disabled={!dirty || pending}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition",
        danger ? "bg-[#9c2b2e] text-white hover:bg-[#9c2b2e]/90" : "bg-ink text-white hover:bg-ink/85",
        !dirty && !pending && "cursor-not-allowed opacity-40 hover:bg-ink",
        danger && !dirty && !pending && "hover:bg-[#9c2b2e]",
        className,
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Spinner button for plain (non-AdminForm) posts — deletes, bin moves. */
export function ActionButton({
  children,
  className,
  danger,
}: {
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm transition disabled:opacity-60",
        danger
          ? "border border-[#9c2b2e]/40 text-[#9c2b2e] hover:bg-[#9c2b2e] hover:text-white"
          : "border border-ink/20 hover:border-ink/50",
        className,
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
