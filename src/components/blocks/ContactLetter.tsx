"use client";
import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import type { ContactTopic } from "./ContactExperience";
const COLORS = { meeting: "#bcc3a8", review: "#d9c697", complaint: "#b7c6cc" };
export function ContactLetter({
  topic,
  title,
  name,
  message,
  step,
  ar,
}: {
  topic: ContactTopic | null;
  title: string;
  name: string;
  message: string;
  step: number;
  ar: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    frame = useRef(0),
    bounds = useRef<DOMRect | null>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <aside
      className="correspondence-art"
      style={
        { "--letter-tint": topic ? COLORS[topic] : "#d8d3c1" } as CSSProperties
      }
    >
      <div className="correspondence-art-caption">
        <span>{ar ? "رسالة إلى الدار" : "A note to the Maison"}</span>
        <span>0{Math.min(step + 1, 4)} / 04</span>
      </div>
      <div
        className="correspondence-scene"
        ref={root}
        aria-hidden="true"
        data-open={step > 0}
        onPointerEnter={(event) => {
          if (
            event.pointerType === "mouse" &&
            matchMedia(
              "(pointer:fine) and (prefers-reduced-motion:no-preference)",
            ).matches
          )
            bounds.current = event.currentTarget.getBoundingClientRect();
        }}
        onPointerMove={(event) => {
          if (!bounds.current) return;
          const b = bounds.current,
            node = event.currentTarget,
            x = (event.clientX - b.left) / b.width - 0.5,
            y = (event.clientY - b.top) / b.height - 0.5;
          cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(() => {
            node.style.setProperty("--letter-rx", `${-y * 9}deg`);
            node.style.setProperty("--letter-ry", `${x * 12}deg`);
          });
        }}
        onPointerLeave={() => {
          bounds.current = null;
          cancelAnimationFrame(frame.current);
          root.current?.style.setProperty("--letter-rx", "0deg");
          root.current?.style.setProperty("--letter-ry", "0deg");
        }}
      >
        <div className="correspondence-orbit" data-contact-float />
        <div className="correspondence-object">
          <div className="correspondence-envelope-back" />
          <div className="correspondence-letter">
            <div className="correspondence-letter-head">
              <span>MISK AL GHAZAAL</span>
              <span>DUBAI</span>
            </div>
            <Image
              src="/logo.webp"
              width={42}
              height={42}
              alt=""
              className="correspondence-letter-crest"
            />
            <p className="correspondence-letter-subject">
              {title || (ar ? "لنبدأ حديثاً" : "Let’s begin a conversation.")}
            </p>
            <p className="correspondence-letter-message">
              {message ||
                (ar
                  ? "كلماتك تجد طريقها إلينا."
                  : "Your words, received with care.")}
            </p>
            <div className="correspondence-ink-lines">
              <i />
              <i />
              <i />
            </div>
            <p className="correspondence-letter-signature">
              {name || (ar ? "منك، بكل عناية" : "From you, with care.")}
            </p>
          </div>
          <div className="correspondence-envelope-front" />
          <div className="correspondence-envelope-fold" />
          <div className="correspondence-seal">M</div>
        </div>
      </div>
      <div className="correspondence-art-foot">
        <span />
        {ar
          ? "تفاصيل صغيرة. عناية شخصية."
          : "Small details. Personal attention."}
        <span />
      </div>
    </aside>
  );
}
