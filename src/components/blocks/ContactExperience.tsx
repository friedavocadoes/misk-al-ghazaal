"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ContactLetter } from "./ContactLetter";
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

import { tx } from "@/lib/i18n";
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

const inputCls = "studio-input cursor-pointer";

export function ContactExperience({
  products,
  initialTopic = null,
}: {
  products: { slug: string; title: string; titleAr?: string }[];
  initialTopic?: ContactTopic | null;
}) {
  const t = useTranslations("Contact");
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    topic: initialTopic,
  });
  const [reference, setReference] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [website, setWebsite] = useState("");
  const set = (k: keyof FormState, v: string | number | ContactTopic | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const TOPICS: {
    id: ContactTopic;
    title: string;
    text: string;
    icon: typeof Star;
  }[] = [
    {
      id: "meeting",
      title: t("topicMeeting"),
      text: t("topicMeetingText"),
      icon: CalendarClock,
    },
    {
      id: "review",
      title: t("topicReview"),
      text: t("topicReviewText"),
      icon: Star,
    },
    {
      id: "complaint",
      title: t("topicComplaint"),
      text: t("topicComplaintText"),
      icon: MessageCircleWarning,
    },
  ];
  const STEPS = [
    t("stepReason"),
    t("stepMessage"),
    t("stepYou"),
    t("stepSend"),
  ];
  const stage = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    previousStep = useRef(0);
  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return;
    let tween: gsap.core.Tween | undefined;
    if (!matchMedia("(prefers-reduced-motion:reduce)").matches)
      tween = gsap.fromTo(
        node,
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.48,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
      );
    if (previousStep.current !== step) {
      heading.current?.focus({ preventScroll: true });
      if (node.getBoundingClientRect().top < 100)
        node.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        });
    }
    previousStep.current = step;
    return () => {
      tween?.kill();
    };
  }, [step]);
  const topicMeta = TOPICS.find((x) => x.id === form.topic);

  const stepValid = () => {
    if (step === 0) return form.topic !== null;
    if (step === 1) {
      if (form.topic === "meeting")
        return form.category !== "" && form.message.trim() !== "";
      if (form.topic === "review")
        return form.product !== "" && form.message.trim() !== "";
      if (form.topic === "complaint")
        return form.complaintType !== "" && form.message.trim() !== "";
    }
    if (step === 2)
      return (
        !!form.name.trim() &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      );
    return true;
  };

  const next = () => stepValid() && setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const submit = async () => {
    if (sending) return;
    setSending(true);
    setSendError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      const data = await response.json();
      if (!response.ok || !data.reference)
        throw new Error(data.error || "Unable to send your message.");
      setReference(data.reference);
      setStep(4);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  if (step === 4) {
    return (
      <div
        ref={stage}
        role="status"
        className="studio-message-received"
        data-contact-reveal
      >
        <span className="mx-auto flex size-14 items-center justify-center bg-ink text-white">
          <Check className="size-6" />
        </span>
        <h2
          ref={heading}
          tabIndex={-1}
          className="mt-6 font-display text-3xl text-ink"
        >
          {t("successTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-espresso">
          {form.topic === "meeting" && t("successMeeting")}
          {form.topic === "review" && t("successReview")}
          {form.topic === "complaint" && t("successComplaint")}
        </p>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          {t("reference")} · {reference}
        </p>
        <button
          type="button"
          className="studio-send-another cursor-pointer"
          onClick={() => {
            setForm({ ...EMPTY, topic: null });
            setStep(0);
            setReference("");
            setSendError("");
          }}
        >
          {t("anotherMessage")} ↗
        </button>
      </div>
    );
  }

  return (
    <div
      className="correspondence-studio"
      data-contact-reveal
      data-intent={form.topic ?? "none"}
    >
      <ContactLetter
        topic={form.topic}
        title={topicMeta?.title ?? ""}
        name={form.name}
        message={form.message}
        step={step}
        ar={locale === "ar"}
      />
      <form
        className="studio-composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 3) next();
          else void submit();
        }}
      >
        <nav className="studio-step-nav" aria-label={t("writingLabel")}>
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              disabled={sending || i > step}
              onClick={() => setStep(i)}
              aria-current={step === i ? "step" : undefined}
              className="cursor-pointer"
            >
              <span>
                {i < step ? (
                  <Check size={12} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <strong>{label}</strong>
            </button>
          ))}
        </nav>
        <div
          key={step}
          ref={stage}
          className="contact-form-body studio-composer-stage"
        >
          <label className="contact-honeypot" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
          {step === 0 && (
            <div>
              <h3 ref={heading} tabIndex={-1} className="studio-stage-title">
                {t("reasonTitle")}
              </h3>
              <div className="mt-6 grid gap-3">
                {TOPICS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => {
                      set("topic", x.id);
                    }}
                    aria-pressed={form.topic === x.id}
                    className={cn(
                      "studio-topic-option cursor-pointer",
                      form.topic === x.id ? "is-selected" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center border",
                        form.topic === x.id
                          ? "border-ink bg-ink text-white"
                          : "border-ink/15 text-gold",
                      )}
                    >
                      <x.icon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-medium text-ink">
                        {x.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-fog">
                        {x.text}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto flex size-5 shrink-0 items-center justify-center border",
                        form.topic === x.id
                          ? "border-ink bg-ink text-white"
                          : "border-ink/20",
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
              <h3 ref={heading} tabIndex={-1} className="studio-stage-title">
                {form.topic === "meeting" && t("meetingTitle")}
                {form.topic === "review" && t("reviewTitle")}
                {form.topic === "complaint" && t("complaintTitle")}
              </h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {form.topic === "meeting" && (
                  <>
                    <Field label={t("company")}>
                      <input
                        value={form.company}
                        onChange={(e) => set("company", e.target.value)}
                        placeholder="Maison …"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={`${t("category")} *`}>
                      <select
                        value={form.category}
                        onChange={(e) => set("category", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">{t("select")}</option>
                        <option>Eau de Parfum / EDT</option>
                        <option>Attars & Misk Oils</option>
                        <option>Bakhoor & Dukhoon</option>
                        <option>Mubakhar & Oudh</option>
                        <option>Full Range / Other</option>
                      </select>
                    </Field>
                    <Field label={t("quantity")}>
                      <select
                        value={form.quantity}
                        onChange={(e) => set("quantity", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">{t("select")}</option>
                        <option>500 - 1,000 units</option>
                        <option>1,000 - 5,000 units</option>
                        <option>5,000 - 20,000 units</option>
                        <option>20,000+ units</option>
                      </select>
                    </Field>
                    <Field label={t("date")}>
                      <input
                        value={form.date}
                        onChange={(e) => set("date", e.target.value)}
                        type="date"
                        className={inputCls}
                      />
                    </Field>
                    <span className="sm:col-span-2">
                      <Field label={`${t("projectDetails")} *`}>
                        <textarea
                          value={form.message}
                          onChange={(e) => set("message", e.target.value)}
                          rows={5}
                          maxLength={5000}
                          placeholder="…"
                          className={inputCls}
                        />
                      </Field>
                    </span>
                  </>
                )}

                {form.topic === "review" && (
                  <>
                    <span className="sm:col-span-2">
                      <Field label={`${t("product")} *`}>
                        <select
                          value={form.product}
                          onChange={(e) => set("product", e.target.value)}
                          className={inputCls}
                        >
                          <option value="">{t("productPick")}</option>
                          {products.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {tx(p.title, p.titleAr, locale)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </span>
                    <span className="sm:col-span-2">
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
                        {t("rating")}
                      </span>
                      <span className="studio-rating-options">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => set("rating", n)}
                            aria-label={`${n} stars`}
                            aria-pressed={n === form.rating}
                            className="p-0.5 cursor-pointer"
                          >
                            <Star
                              className={cn(
                                "size-7",
                                n <= form.rating
                                  ? "fill-gold text-gold"
                                  : "text-ink/20",
                              )}
                            />
                          </button>
                        ))}
                      </span>
                    </span>
                    <span className="sm:col-span-2">
                      <Field label={t("reviewTitleLabel")}>
                        <input
                          value={form.title}
                          onChange={(e) => set("title", e.target.value)}
                          placeholder="…"
                          className={inputCls}
                        />
                      </Field>
                    </span>
                    <span className="sm:col-span-2">
                      <Field label={`${t("reviewBody")} *`}>
                        <textarea
                          value={form.message}
                          onChange={(e) => set("message", e.target.value)}
                          rows={5}
                          maxLength={5000}
                          placeholder="…"
                          className={inputCls}
                        />
                      </Field>
                    </span>
                  </>
                )}

                {form.topic === "complaint" && (
                  <>
                    <Field label={t("orderNo")}>
                      <input
                        value={form.orderNo}
                        onChange={(e) => set("orderNo", e.target.value)}
                        placeholder="MG-…"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={`${t("issueType")} *`}>
                      <select
                        value={form.complaintType}
                        onChange={(e) => set("complaintType", e.target.value)}
                        className={inputCls}
                      >
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
                        <textarea
                          value={form.message}
                          onChange={(e) => set("message", e.target.value)}
                          rows={5}
                          maxLength={5000}
                          placeholder="…"
                          className={inputCls}
                        />
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
              <h3 ref={heading} tabIndex={-1} className="studio-stage-title">
                {t("youTitle")}
              </h3>
              <p className="studio-stage-note">{t("youText")}</p>
              <div className="studio-identity-fields">
                {" "}
                <Field label={`${t("name")} *`}>
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Layali Ahmed"
                    className={inputCls}
                  />
                </Field>
                <Field label={`${t("email")} *`}>
                  <input
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </Field>
                <Field label={t("phone")}>
                  <input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+971 …"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h3 ref={heading} tabIndex={-1} className="studio-stage-title">
                {t("confirmTitle")}
              </h3>
              <div className="studio-confirm-topic">
                <span>{topicMeta?.title}</span>
                <button type="button" onClick={() => setStep(0)} className="cursor-pointer">
                  {t("editLabel")}
                </button>
              </div>
              <dl className="studio-confirmation">
                {[
                  { label: t("name"), value: form.name, edit: 2 },
                  { label: t("email"), value: form.email, edit: 2 },
                  { label: t("phone"), value: form.phone, edit: 2 },
                  ...(form.topic === "meeting"
                    ? [
                        { label: t("company"), value: form.company, edit: 1 },
                        { label: t("category"), value: form.category, edit: 1 },
                        { label: t("quantity"), value: form.quantity, edit: 1 },
                        { label: t("date"), value: form.date, edit: 1 },
                      ]
                    : []),
                  ...(form.topic === "review"
                    ? [
                        {
                          label: t("product"),
                          value: tx(
                            products.find((p) => p.slug === form.product)
                              ?.title ?? form.product,
                            products.find((p) => p.slug === form.product)
                              ?.titleAr,
                            locale,
                          ),
                          edit: 1,
                        },
                        {
                          label: t("rating"),
                          value: `${form.rating} / 5`,
                          edit: 1,
                        },
                        {
                          label: t("reviewTitleLabel"),
                          value: form.title,
                          edit: 1,
                        },
                      ]
                    : []),
                  ...(form.topic === "complaint"
                    ? [
                        { label: t("orderNo"), value: form.orderNo, edit: 1 },
                        {
                          label: t("issueType"),
                          value: form.complaintType,
                          edit: 1,
                        },
                      ]
                    : []),
                ]
                  .filter((field) => field.value)
                  .map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                      <button
                        type="button"
                        onClick={() => setStep(field.edit)}
                        aria-label={`${t("editLabel")} ${field.label}`}
                        className="cursor-pointer"
                      >
                        ↗
                      </button>
                    </div>
                  ))}
              </dl>
              <div className="studio-confirm-message">
                <div>
                  <span>
                    {form.topic === "meeting"
                      ? t("projectDetails")
                      : form.topic === "complaint"
                        ? t("issueBody")
                        : t("reviewBody")}
                  </span>
                  <button type="button" onClick={() => setStep(1)} className="cursor-pointer">
                    {t("editLabel")}
                  </button>
                </div>
                <p>{form.message}</p>
              </div>
            </div>
          )}

          {sendError && (
            <p role="alert" className="mt-5 text-sm text-red-800">
              {sendError}
            </p>
          )}
          {/* Nav */}
          <div className="studio-form-footer">
            <button
              type="button"
              onClick={back}
              disabled={step === 0 || sending}
              className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-espresso transition hover:text-ink disabled:opacity-30 cursor-pointer"
            >
              <ArrowLeft className="size-4" /> {t("back")}
            </button>
            {step < 3 ? (
              <Button type="submit" disabled={!stepValid()} className="cursor-pointer">
                {t("continue")} <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={sending} className="cursor-pointer">
                {sending
                  ? locale === "ar"
                    ? "جارٍ الإرسال…"
                    : t("sendingLabel")
                  : t("send")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}