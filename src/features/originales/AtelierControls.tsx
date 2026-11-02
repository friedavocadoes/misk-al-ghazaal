"use client";
import { useEffect, useRef } from "react";
import { MorphFrame, FRAME_PATH, OPEN_FRAME } from "./MorphFrame";
import { atelierGsap } from "./atelier-gsap";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import s from "./atelier.module.css";

export function AtelierQuantity({
  value,
  max,
  onChange,
  ar = false,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  ar?: boolean;
}) {
  const reduced = useReducedMotion();
  const dial = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let live = true,
      stop = () => {};
    void atelierGsap().then(({ gsap }) => {
      if (!live || !dial.current) return;
      const tween = gsap.to(dial.current, {
        rotation: value * 36,
        transformOrigin: "50% 50%",
        duration: reduced ? 0 : 0.65,
        ease: "back.out(1.5)",
      });
      stop = () => tween.kill();
    });
    return () => {
      live = false;
      stop();
    };
  }, [value, reduced]);
  return (
    <div className={s.quantity}>
      <span>{ar ? "الكمية" : "Quantity"}</span>
      <div className={s.quantityMechanism}>
        <button
          type="button"
          data-ios-haptic="on"
          aria-label={ar ? "تقليل الكمية" : "Decrease quantity"}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
        >
          <Minus size={15} />
        </button>
        <span className={s.numberWindow} aria-hidden="true">
          <svg ref={dial} className={s.quantityDial} viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="currentColor"
              fill="none"
              strokeDasharray="1 8"
            />
            <path
              d="M50 2V8 M98 50H92 M50 98V92 M2 50H8"
              stroke="currentColor"
            />
          </svg>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={value}
              className={s.numberFace}
              initial={
                reduced ? false : { rotateX: -100, y: 18, opacity: 0, z: 25 }
              }
              animate={{ rotateX: 0, y: 0, opacity: 1, z: 0 }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { rotateX: 95, y: -18, opacity: 0, z: -15 }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 170, damping: 20 }
              }
            >
              {String(value).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {value}
        </span>
        <button
          type="button"
          data-ios-haptic="on"
          aria-label={ar ? "زيادة الكمية" : "Increase quantity"}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
export function AtelierBagButton({
  added,
  disabled,
  onClick,
  ar = false,
  quantity = 1,
  action = "bag",
  pending = false,
  requiresLogin = false,
}: {
  added: boolean;
  disabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ar?: boolean;
  quantity?: number;
  action?: "bag" | "purchase";
  pending?: boolean;
  requiresLogin?: boolean;
}) {
  const reduced = useReducedMotion(),
    label = pending
      ? ar
        ? "جارٍ المتابعة…"
        : "Continuing…"
      : requiresLogin && action === "purchase"
        ? ar
          ? "تسجيل الدخول والمتابعة"
          : "Sign in & continue"
        : action === "purchase" && !disabled
          ? ar
            ? "اشتر الآن"
            : "Purchase now"
          : disabled
            ? ar
              ? "نفد المخزون"
              : "Out of stock"
            : added
              ? ar
                ? "أضيف إلى الحقيبة"
                : "Added to your bag"
              : ar
                ? "أضف إلى الحقيبة"
                : "Add to bag";
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let live = true,
      stop = () => {};
    void atelierGsap().then(({ gsap }) => {
      if (!live || !button.current) return;
      const el = button.current,
        frame = el.querySelector("[data-morph-frame]"),
        icon = el.querySelector("[data-seal-path]");
      const ctx = gsap.context(() => {
        gsap.to(icon, {
          morphSVG: added
            ? "M5 17 L13 25 L28 8"
            : action === "purchase"
              ? "M8 3H24V29L20 26L16 29L12 26L8 29Z M12 10H20 M12 15H20 M12 20H17"
              : "M8 10H24V27H8Z M12 10V7C12 2 20 2 20 7V10",
          duration: reduced ? 0 : 0.55,
          ease: "power3.inOut",
        });
        gsap.to(frame, {
          morphSVG: added
            ? "M45 2 H955 L998 45 V555 L955 598 H45 L2 555 V45 Z"
            : FRAME_PATH,
          duration: reduced ? 0 : 0.65,
          ease: "power3.inOut",
        });
      }, el);
      const enter = () => {
        if (!reduced && !added)
          gsap.to(frame, {
            morphSVG: OPEN_FRAME,
            duration: 0.5,
            ease: "power3.out",
            overwrite: true,
          });
      };
      const leave = () => {
        if (!reduced && !added)
          gsap.to(frame, {
            morphSVG: FRAME_PATH,
            duration: 0.65,
            ease: "elastic.out(1,.65)",
            overwrite: true,
          });
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("focus", enter);
      el.addEventListener("blur", leave);
      stop = () => {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
        el.removeEventListener("focus", enter);
        el.removeEventListener("blur", leave);
        gsap.killTweensOf([frame, icon]);
        ctx.revert();
      };
    });
    return () => {
      live = false;
      stop();
    };
  }, [added, reduced, action]);
  return (
    <div className={s.bagMorphTrack}>
      <motion.button
        ref={button}
        layout={!reduced}
        data-added={added}
        data-purchase-action={action}
        data-ios-haptic="on"
        type="button"
        disabled={disabled}
        aria-label={label}
        className={s.bagMorph}
        onClick={onClick}
        animate={{ width: added ? "82%" : "100%" }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 170, damping: 23 }
        }
      >
        <MorphFrame kind="button" />
        <span className={s.bagSweep} aria-hidden="true" />
        <span className={s.bagWords}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={added ? "added" : "add"}
              initial={
                reduced ? false : { y: 20, opacity: 0, filter: "blur(5px)" }
              }
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={
                reduced
                  ? { opacity: 0 }
                  : { y: -20, opacity: 0, filter: "blur(5px)" }
              }
              transition={{
                duration: reduced ? 0 : 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <small>
                {added
                  ? `${String(quantity).padStart(2, "0")} · ORIGINALES`
                  : action === "purchase"
                    ? ar
                      ? "إتمام الطلب"
                      : "CONTINUE TO CHECKOUT"
                    : ar
                      ? "تعبيرك الخاص"
                      : "MAKE IT PART OF YOU"}
              </small>
              <strong>{label}</strong>
            </motion.span>
          </AnimatePresence>
        </span>
        <motion.span
          className={s.bagSeal}
          animate={{
            borderRadius: added ? "50%" : "2px",
            rotate: added ? 90 : 0,
          }}
          transition={{ duration: reduced ? 0 : 0.6 }}
          aria-hidden="true"
        >
          <motion.span animate={{ rotate: added ? -90 : 0 }}>
            <svg
              viewBox="0 0 32 32"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path
                data-seal-path
                d={
                  action === "purchase"
                    ? "M8 3H24V29L20 26L16 29L12 26L8 29Z M12 10H20 M12 15H20 M12 20H17"
                    : "M8 10H24V27H8Z M12 10V7C12 2 20 2 20 7V10"
                }
              />
            </svg>
          </motion.span>
        </motion.span>
      </motion.button>
    </div>
  );
}
