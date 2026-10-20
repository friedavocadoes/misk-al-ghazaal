"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";
export function ReviewForm({
  productId,
  productSlug,
  locale,
}: {
  productId: string;
  productSlug: string;
  locale: string;
}) {
  const ar = locale === "ar";
  const [rating, setRating] = useState(0);
  const [step, setStep] = useState("rate");
  const [logged, setLogged] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const pending = useRef<{ n: number; body: string } | null>(null);
  const running = useRef(false);
  const confirmed = useRef(0);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    const client = createClient();
    async function load() {
      const gen = ++generation;
      const rev = revision.current;
      try {
        const r = await fetch(`/api/reviews?productId=${productId}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!alive || gen !== generation) return;
        setLogged(!!j.loggedIn);
        setText(j.loggedIn ? (j.review?.body ?? "") : "");
        if (revision.current === rev) {
          confirmed.current = j.rating ?? 0;
          setRating(j.rating ?? 0);
          setStep(j.rating ? "ask" : "rate");
        }
      } catch {}
    }
    void load();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        revision.current++;
        setLogged(false);
        setText("");
        setStep("rate");
        void load();
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [productId]);
  async function save(n: number, body = "") {
    revision.current++;
    pending.current = { n, body };
    setRating(n);
    setStep(body ? "done" : "ask");
    setError("");
    if (running.current) return;
    running.current = true;
    setBusy(true);
    while (pending.current) {
      const next = pending.current;
      pending.current = null;
      const wasRated = confirmed.current > 0;
      try {
        const r = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({ productId, rating: next.n, body: next.body }),
        });
        if (!r.ok) throw Error();
        confirmed.current = next.n;
        if (!pending.current)
          toast.success(
            next.body
              ? ar
                ? "تم إرسال المراجعة"
                : "Review sent for approval"
              : wasRated
                ? ar
                  ? "تم تحديث التقييم"
                  : "Rating updated"
                : ar
                  ? "تمت إضافة التقييم"
                  : "Rating added",
          );
      } catch {
        if (!pending.current) {
          setRating(confirmed.current);
          setStep(confirmed.current ? "ask" : "rate");
          const message = ar
            ? "تعذر الحفظ. حاول مجدداً."
            : "Couldn’t save. Please try again.";
          setError(message);
          toast.error(message);
        }
      }
    }
    running.current = false;
    setBusy(false);
  }
  return (
    <div
      className="rating-glass"
      style={{ "--rating-gold": `${rating * 9}%` } as CSSProperties}
      aria-busy={busy}
    >
      <p className="eyebrow">
        {ar ? "انطباعك يهمنا" : "A moment for your impression"}
      </p>
      <h3>
        {step === "write"
          ? ar
            ? "احكِ لنا عن تجربتك"
            : "Tell us a little more."
          : step === "done"
            ? ar
              ? "شكراً لمشاركتك"
              : "Thank you for sharing."
            : ar
              ? "كيف وجدت هذا العطر؟"
              : "How did this scent feel?"}
      </h3>
      <div
        className="rating-stars"
        role="group"
        aria-label={ar ? "التقييم" : "Rate this fragrance"}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            aria-label={`${n} / 5`}
            aria-pressed={rating === n}
            onClick={() => void save(n)}
          >
            <Star fill={n <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      {step === "rate" && (
        <p>{ar ? "لمسة واحدة تكفي." : "One touch is all it takes."}</p>
      )}
      {step === "ask" && (
        <div className="rating-stage">
          <p>
            {ar
              ? "حُفظ تقييمك. هل تود كتابة مراجعة؟"
              : "Would you like to add a few words?"}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-5">
            {logged ? (
              <button
                className="rating-primary"
                onClick={() => setStep("write")}
              >
                {ar ? "اكتب مراجعة" : "Yes, share my experience"}
              </button>
            ) : (
              <Link
                className="rating-primary"
                href={`/account/login?next=${encodeURIComponent(`/product/${productSlug}#reviews`)}`}
              >
                {ar ? "تسجيل الدخول للكتابة" : "Sign in to write a review"}
              </Link>
            )}
            <button onClick={() => setStep("thanks")}>
              {ar ? "ليس الآن" : "Not now"}
            </button>
          </div>
        </div>
      )}
      {step === "write" && (
        <form
          className="rating-stage"
          onSubmit={(e) => {
            e.preventDefault();
            void save(rating, text);
          }}
        >
          <label className="sr-only" htmlFor={`review-${productId}`}>
            {ar ? "تجربتك" : "Your experience"}
          </label>
          <textarea
            id={`review-${productId}`}
            required
            maxLength={2000}
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ar ? "ما الذي أحببته؟" : "What stayed with you?"}
          />
          <p>
            {ar
              ? "تظهر المراجعات بعد الموافقة."
              : "Your words will appear after approval. Your rating is already counted."}
          </p>
          <button className="rating-primary mt-5" disabled={busy}>
            {busy
              ? ar
                ? "جارٍ الحفظ"
                : "Saving…"
              : ar
                ? "إرسال المراجعة"
                : "Send review"}
          </button>
        </form>
      )}
      {(step === "thanks" || step === "done") && (
        <p role="status">
          {step === "done"
            ? ar
              ? "مراجعتك قيد الموافقة."
              : "Your review is awaiting approval."
            : ar
              ? "حُفظ تقييمك. شكراً لك."
              : "Your rating is saved. Thank you."}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
