"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Minus, Plus } from "lucide-react";
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
}: {
  added: boolean;
  disabled: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ar?: boolean;
  quantity?: number;
}) {
  const reduced = useReducedMotion(),
    label = disabled
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
  return (
    <div className={s.bagMorphTrack}>
      <motion.button
        layout={!reduced}
        data-added={added}
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
            {added ? <Check size={21} /> : <ArrowUpRight size={21} />}
          </motion.span>
        </motion.span>
      </motion.button>
    </div>
  );
}
