"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  MessageCircleWarning,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export type ContactTopic = "meeting" | "review" | "complaint";

const TOPICS: {
  id: ContactTopic;
  title: string;
  text: string;
  icon: typeof Star;
}[] = [
  {
    id: "meeting",
    title: "Manufacturing Meeting",
    text: "Private label, bulk orders and partnerships.",
    icon: CalendarClock,
  },
  {
    id: "review",
    title: "Leave a Review",
    text: "Tell the maison what you loved.",
    icon: Star,
  },
  {
    id: "complaint",
    title: "Raise a Complaint",
    text: "Something wrong? We make it right.",
    icon: MessageCircleWarning,
  },
];

const STEPS = ["Topic", "Details", "Confirm"];

interface FormState {
  topic: ContactTopic | null;
  name: string;
  email: string;
  phone: string;
  company: string;
  category: string;
  quantity: string;
  date: string;
  product: string;
  rating: number;
  title: string;
  message: string;
  orderNo: string;
  complaintType: string;
}

const EMPTY: FormState = {
  topic: null,
  name: "",
  email: "",
  phone: "",
  company: "",
  category: "",
  quantity: "",
  date: "",
  product: "",
  rating: 5,
  title: "",
  message: "",
  orderNo: "",
  complaintType: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-gold focus:outline-none";

export function ContactExperience({
  products,
  initialTopic = null,
}: {
  products: { slug: string; title: string }[];
  initialTopic?: ContactTopic | null;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ ...EMPTY, topic: initialTopic });
  const [reference, setReference] = useState("");
  const set = (k: keyof FormState, v: string | number | ContactTopic | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const topicMeta = TOPICS.find((t) => t.id === form.topic);

  const stepValid = () => {
    if (step === 0) return form.topic !== null;
    if (step === 1) {
      if (!form.name.trim() || !form.email.trim()) return false;
      if (form.topic === "meeting")
        return form.category !== "" && form.message.trim() !== "";
      if (form.topic === "review")
        return form.product !== "" && form.message.trim() !== "";
      if (form.topic === "complaint")
        return form.complaintType !== "" && form.message.trim() !== "";
    }
    return true;
  };

  const next = () => stepValid() && setStep((s) => Math.min(2, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const submit = () => {
    setReference(
      `MG-${Date.now().toString(36).toUpperCase().slice(-6)}`
    );
    setStep(3);
  };

  if (step === 3) {
    return (
      <div className="border border-ink/10 bg-white p-10 text-center md:p-14">
        <span className="mx-auto flex size-14 items-center justify-center bg-ink text-white">
          <Check className="size-6" />
        </span>
        <h2 className="mt-6 font-display text-3xl text-ink">Received with thanks.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-espresso">
          {form.topic === "meeting" &&
            "Our partnerships desk will write within two working days to arrange your visit."}
          {form.topic === "review" &&
            "Your words join the maison journal after a brief moderation."}
          {form.topic === "complaint" &&
            "A client-care specialist is on your case and will reply within 24 hours."}
        </p>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          Reference · {reference}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-0 border border-ink/10 bg-white lg:grid-cols-[340px_1fr]">
      {/* Info rail */}
      <div className="bg-ink p-8 text-white md:p-10">
        <p className="eyebrow text-gold-soft">Maison Misk Al Ghazaal</p>
        <h2 className="mt-3 font-display text-3xl leading-tight">
          How may we serve you?
        </h2>
        <ol className="mt-8 space-y-0">
          {STEPS.map((label, i) => (
            <li key={label} className="flex gap-4">
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center border text-[12px] font-semibold",
                    i < step
                      ? "border-gold-soft bg-gold-soft text-ink"
                      : i === step
                        ? "border-white text-white"
                        : "border-white/25 text-white/50"
                  )}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="w-px flex-1 bg-white/20" />
                )}
              </span>
              <span
                className={cn(
                  "pb-7 text-[12px] font-semibold uppercase tracking-[0.18em]",
                  i <= step ? "text-white" : "text-white/45"
                )}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4 border-t border-white/15 pt-6 text-sm text-white/75">
          <p>{SITE.address}</p>
          <p className="mt-1">{SITE.phone}</p>
          <p className="mt-1">{SITE.email}</p>
          <p className="mt-1 text-white/55">{SITE.hours}</p>
        </div>
      </div>

      {/* Form body */}
      <div className="p-8 md:p-10">
        {step === 0 && (
          <div>
            <h3 className="font-display text-2xl text-ink">
              What brings you to the maison?
            </h3>
            <div className="mt-6 grid gap-3">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    set("topic", t.id);
                  }}
                  aria-pressed={form.topic === t.id}
                  className={cn(
                    "flex items-center gap-4 border p-5 text-left transition",
                    form.topic === t.id
                      ? "border-ink bg-cream"
                      : "border-ink/15 hover:border-ink/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center border",
                      form.topic === t.id
                        ? "border-ink bg-ink text-white"
                        : "border-ink/15 text-gold"
                    )}
                  >
                    <t.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{t.title}</span>
                    <span className="mt-0.5 block text-[13px] text-fog">{t.text}</span>
                  </span>
                  <span
                    className={cn(
                      "ml-auto flex size-5 shrink-0 items-center justify-center border",
                      form.topic === t.id ? "border-gold bg-gold text-white" : "border-ink/20"
                    )}
                  >
                    {form.topic === t.id && <Check className="size-3.5" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="font-display text-2xl text-ink">
              {form.topic === "meeting" && "Tell us about your project"}
              {form.topic === "review" && "Share your experience"}
              {form.topic === "complaint" && "Describe the issue"}
            </h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Full name *">
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Layali Ahmed" className={inputCls} />
              </Field>
              <Field label="Email *">
                <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="you@example.com" className={inputCls} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 …" className={inputCls} />
              </Field>

              {form.topic === "meeting" && (
                <>
                  <Field label="Company / Brand">
                    <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Maison …" className={inputCls} />
                  </Field>
                  <Field label="Product category *">
                    <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option>Eau de Parfum / EDT</option>
                      <option>Attars & Misk Oils</option>
                      <option>Bakhoor & Dukhoon</option>
                      <option>Mubakhar & Oudh</option>
                      <option>Full Range / Other</option>
                    </select>
                  </Field>
                  <Field label="Estimated Quantity">
                    <select value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option>500 – 1,000 units</option>
                      <option>1,000 – 5,000 units</option>
                      <option>5,000 – 20,000 units</option>
                      <option>20,000+ units</option>
                    </select>
                  </Field>
                  <Field label="Preferred Meeting Date">
                    <input value={form.date} onChange={(e) => set("date", e.target.value)} type="date" className={inputCls} />
                  </Field>
                  <span className="sm:col-span-2">
                    <Field label="Project details *">
                      <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="Scent direction, packaging, timelines…" className={inputCls} />
                    </Field>
                  </span>
                </>
              )}

              {form.topic === "review" && (
                <>
                  <span className="sm:col-span-2">
                    <Field label="Product *">
                      <select value={form.product} onChange={(e) => set("product", e.target.value)} className={inputCls}>
                        <option value="">Select the piece…</option>
                        {products.map((p) => (
                          <option key={p.slug} value={p.slug}>{p.title}</option>
                        ))}
                      </select>
                    </Field>
                  </span>
                  <span className="sm:col-span-2">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">Rating</span>
                    <span className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => set("rating", n)} aria-label={`${n} stars`} className="p-0.5">
                          <Star className={cn("size-7", n <= form.rating ? "fill-gold text-gold" : "text-ink/20")} />
                        </button>
                      ))}
                    </span>
                  </span>
                  <span className="sm:col-span-2">
                    <Field label="Review Title">
                      <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="An evening in oud…" className={inputCls} />
                    </Field>
                  </span>
                  <span className="sm:col-span-2">
                    <Field label="Your Review *">
                      <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="Longevity, projection, the moment it suits…" className={inputCls} />
                    </Field>
                  </span>
                </>
              )}

              {form.topic === "complaint" && (
                <>
                  <Field label="Order Number">
                    <input value={form.orderNo} onChange={(e) => set("orderNo", e.target.value)} placeholder="MG-…" className={inputCls} />
                  </Field>
                  <Field label="Issue Type *">
                    <select value={form.complaintType} onChange={(e) => set("complaintType", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option>Damaged in delivery</option>
                      <option>Wrong item received</option>
                      <option>Late delivery</option>
                      <option>Quality concern</option>
                      <option>Other</option>
                    </select>
                  </Field>
                  <span className="sm:col-span-2">
                    <Field label="What Happened? *">
                      <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="Tell us everything — photos can follow by email…" className={inputCls} />
                    </Field>
                  </span>
                </>
              )}
            </div>
            {!stepValid() && (
              <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.14em] text-[#9c2b2e]">
                Please complete the required fields to continue.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="font-display text-2xl text-ink">Confirm & send</h3>
            <dl className="mt-6 divide-y divide-ink/10 border border-ink/10 text-sm">
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-fog">Topic</dt>
                <dd className="font-medium text-ink">{topicMeta?.title}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-fog">Name</dt>
                <dd className="font-medium text-ink">{form.name}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-fog">Email</dt>
                <dd className="font-medium text-ink">{form.email}</dd>
              </div>
              {form.topic === "meeting" && (
                <>
                  <div className="flex justify-between gap-4 px-5 py-3">
                    <dt className="text-fog">Category</dt>
                    <dd className="font-medium text-ink">{form.category}</dd>
                  </div>
                  {form.quantity && (
                    <div className="flex justify-between gap-4 px-5 py-3">
                      <dt className="text-fog">Quantity</dt>
                      <dd className="font-medium text-ink">{form.quantity}</dd>
                    </div>
                  )}
                  {form.date && (
                    <div className="flex justify-between gap-4 px-5 py-3">
                      <dt className="text-fog">Preferred date</dt>
                      <dd className="font-medium text-ink">{form.date}</dd>
                    </div>
                  )}
                </>
              )}
              {form.topic === "review" && (
                <div className="flex justify-between gap-4 px-5 py-3">
                  <dt className="text-fog">Rating</dt>
                  <dd className="font-medium text-ink">{form.rating} / 5</dd>
                </div>
              )}
              {form.topic === "complaint" && (
                <div className="flex justify-between gap-4 px-5 py-3">
                  <dt className="text-fog">Issue</dt>
                  <dd className="font-medium text-ink">{form.complaintType}</dd>
                </div>
              )}
              <div className="px-5 py-3">
                <dt className="text-fog">Message</dt>
                <dd className="mt-1 leading-relaxed text-ink">{form.message}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-espresso transition hover:text-ink disabled:opacity-30"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          {step < 2 ? (
            <Button onClick={next} disabled={!stepValid()}>
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit}>Send Message</Button>
          )}
        </div>
      </div>
    </div>
  );
}
