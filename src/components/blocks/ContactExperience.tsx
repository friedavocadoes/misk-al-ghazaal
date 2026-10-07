"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  MessageCircleWarning,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { pick } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type ContactTopic = "meeting" | "review" | "complaint";

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
  const t = useTranslations("Contact");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({ ...EMPTY, topic: initialTopic });
  const [reference, setReference] = useState("");
  const set = (k: keyof FormState, v: string | number | ContactTopic | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const TOPICS: { id: ContactTopic; title: string; text: string; icon: typeof Star }[] = [
    { id: "meeting", title: t("topicMeeting"), text: t("topicMeetingText"), icon: CalendarClock },
    { id: "review", title: t("topicReview"), text: t("topicReviewText"), icon: Star },
    { id: "complaint", title: t("topicComplaint"), text: t("topicComplaintText"), icon: MessageCircleWarning },
  ];
  const STEPS = [t("stepTopic"), t("stepDetails"), t("stepConfirm")];
  const topicMeta = TOPICS.find((x) => x.id === form.topic);

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
    setReference(`MG-${Date.now().toString(36).toUpperCase().slice(-6)}`);
    setStep(3);
  };

  if (step === 3) {
    return (
      <div className="border border-ink/10 bg-white p-10 text-center md:p-14">
        <span className="mx-auto flex size-14 items-center justify-center bg-ink text-white">
          <Check className="size-6" />
        </span>
        <h2 className="mt-6 font-display text-3xl text-ink">{t("successTitle")}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-espresso">
          {form.topic === "meeting" && t("successMeeting")}
          {form.topic === "review" && t("successReview")}
          {form.topic === "complaint" && t("successComplaint")}
        </p>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          {t("reference")} · {reference}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-0 border border-ink/10 bg-white lg:grid-cols-[340px_1fr]">
      {/* Info rail */}
      <div className="bg-ink p-8 text-white md:p-10">
        <p className="eyebrow text-gold-soft">Maison Misk Al Ghazaal</p>
        <h2 className="mt-3 font-display text-3xl leading-tight">{t("serve")}</h2>
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
          <p>{pick(SITE.address, locale)}</p>
          <p className="mt-1">{SITE.phone}</p>
          <p className="mt-1">{SITE.email}</p>
          <p className="mt-1 text-white/55">{pick(SITE.hours, locale)}</p>
        </div>
      </div>

      {/* Form body */}
      <div className="p-8 md:p-10">
        {step === 0 && (
          <div>
            <h3 className="font-display text-2xl text-ink">{t("serve")}</h3>
            <div className="mt-6 grid gap-3">
              {TOPICS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => {
                    set("topic", x.id);
                  }}
                  aria-pressed={form.topic === x.id}
                  className={cn(
                    "flex items-center gap-4 border p-5 text-left transition",
                    form.topic === x.id
                      ? "border-ink bg-cream"
                      : "border-ink/15 hover:border-ink/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center border",
                      form.topic === x.id
                        ? "border-ink bg-ink text-white"
                        : "border-ink/15 text-gold"
                    )}
                  >
                    <x.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{x.title}</span>
                    <span className="mt-0.5 block text-[13px] text-fog">{x.text}</span>
                  </span>
                  <span
                    className={cn(
                      "ml-auto flex size-5 shrink-0 items-center justify-center border",
                      form.topic === x.id ? "border-gold bg-gold text-white" : "border-ink/20"
                    )}
                  >
                    {form.topic === x.id && <Check className="size-3.5" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="font-display text-2xl text-ink">
              {form.topic === "meeting" && t("meetingTitle")}
              {form.topic === "review" && t("reviewTitle")}
              {form.topic === "complaint" && t("complaintTitle")}
            </h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label={`${t("name")} *`}>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Layali Ahmed" className={inputCls} />
              </Field>
              <Field label={`${t("email")} *`}>
                <input value={form.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="you@example.com" className={inputCls} />
              </Field>
              <Field label={t("phone")}>
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 …" className={inputCls} />
              </Field>

              {form.topic === "meeting" && (
                <>
                  <Field label={t("company")}>
                    <input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Maison …" className={inputCls} />
                  </Field>
                  <Field label={`${t("category")} *`}>
                    <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                      <option value="">{t("select")}</option>
                      <option>Eau de Parfum / EDT</option>
                      <option>Attars & Misk Oils</option>
                      <option>Bakhoor & Dukhoon</option>
                      <option>Mubakhar & Oudh</option>
                      <option>Full Range / Other</option>
                    </select>
                  </Field>
                  <Field label={t("quantity")}>
                    <select value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={inputCls}>
                      <option value="">{t("select")}</option>
                      <option>500 – 1,000 units</option>
                      <option>1,000 – 5,000 units</option>
                      <option>5,000 – 20,000 units</option>
                      <option>20,000+ units</option>
                    </select>
                  </Field>
                  <Field label={t("date")}>
                    <input value={form.date} onChange={(e) => set("date", e.target.value)} type="date" className={inputCls} />
                  </Field>
                  <span className="sm:col-span-2">
                    <Field label={`${t("projectDetails")} *`}>
                      <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="…" className={inputCls} />
                    </Field>
                  </span>
                </>
              )}

              {form.topic === "review" && (
                <>
                  <span className="sm:col-span-2">
                    <Field label={`${t("product")} *`}>
                      <select value={form.product} onChange={(e) => set("product", e.target.value)} className={inputCls}>
                        <option value="">{t("productPick")}</option>
                        {products.map((p) => (
                          <option key={p.slug} value={p.slug}>{p.title}</option>
                        ))}
                      </select>
                    </Field>
                  </span>
                  <span className="sm:col-span-2">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{t("rating")}</span>
                    <span className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" onClick={() => set("rating", n)} aria-label={`${n} stars`} className="p-0.5">
                          <Star className={cn("size-7", n <= form.rating ? "fill-gold text-gold" : "text-ink/20")} />
                        </button>
                      ))}
                    </span>
                  </span>
                  <span className="sm:col-span-2">
                    <Field label={t("reviewTitleLabel")}>
                      <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="…" className={inputCls} />
                    </Field>
                  </span>
                  <span className="sm:col-span-2">
                    <Field label={`${t("reviewBody")} *`}>
                      <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="…" className={inputCls} />
                    </Field>
                  </span>
                </>
              )}

              {form.topic === "complaint" && (
                <>
                  <Field label={t("orderNo")}>
                    <input value={form.orderNo} onChange={(e) => set("orderNo", e.target.value)} placeholder="MG-…" className={inputCls} />
                  </Field>
                  <Field label={`${t("issueType")} *`}>
                    <select value={form.complaintType} onChange={(e) => set("complaintType", e.target.value)} className={inputCls}>
                      <option value="">{t("select")}</option>
                      <option>Damaged in delivery</option>
                      <option>Wrong item received</option>
                      <option>Late delivery</option>
                      <option>Quality concern</option>
                      <option>Other</option>
                    </select>
                  </Field>
                  <span className="sm:col-span-2">
                    <Field label={`${t("issueBody")} *`}>
                      <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="…" className={inputCls} />
                    </Field>
                  </span>
                </>
              )}
            </div>
            {!stepValid() && (
              <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.14em] text-[#9c2b2e]">
                {t("requiredNote")}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="font-display text-2xl text-ink">{t("confirmTitle")}</h3>
            <dl className="mt-6 divide-y divide-ink/10 border border-ink/10 text-sm">
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-fog">{t("stepTopic")}</dt>
                <dd className="font-medium text-ink">{topicMeta?.title}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-fog">{t("name")}</dt>
                <dd className="font-medium text-ink">{form.name}</dd>
              </div>
              <div className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-fog">{t("email")}</dt>
                <dd className="font-medium text-ink">{form.email}</dd>
              </div>
              {form.topic === "meeting" && (
                <>
                  <div className="flex justify-between gap-4 px-5 py-3">
                    <dt className="text-fog">{t("category")}</dt>
                    <dd className="font-medium text-ink">{form.category}</dd>
                  </div>
                  {form.quantity && (
                    <div className="flex justify-between gap-4 px-5 py-3">
                      <dt className="text-fog">{t("quantity")}</dt>
                      <dd className="font-medium text-ink">{form.quantity}</dd>
                    </div>
                  )}
                  {form.date && (
                    <div className="flex justify-between gap-4 px-5 py-3">
                      <dt className="text-fog">{t("date")}</dt>
                      <dd className="font-medium text-ink">{form.date}</dd>
                    </div>
                  )}
                </>
              )}
              {form.topic === "review" && (
                <div className="flex justify-between gap-4 px-5 py-3">
                  <dt className="text-fog">{t("rating")}</dt>
                  <dd className="font-medium text-ink">{form.rating} / 5</dd>
                </div>
              )}
              {form.topic === "complaint" && (
                <div className="flex justify-between gap-4 px-5 py-3">
                  <dt className="text-fog">{t("issueType")}</dt>
                  <dd className="font-medium text-ink">{form.complaintType}</dd>
                </div>
              )}
              <div className="px-5 py-3">
                <dt className="text-fog">{t("reviewBody")}</dt>
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
            <ArrowLeft className="size-4" /> {t("back")}
          </button>
          {step < 2 ? (
            <Button onClick={next} disabled={!stepValid()}>
              {t("continue")} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit}>{t("send")}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
