"use client";
import { useId } from "react";

/** Magic UI morphing-text's blur/alpha threshold, driven by the bottle dissolve, not a timer. */
export function EditionMorphName({ name }: { name: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <h2 style={{ position: "relative" }}>
      <span className="sr-only">{name}</span>
      <span
        aria-hidden="true"
        data-name-filter={id}
        style={{
          display: "block",
          position: "relative",
          height: "1.2em",
          width: "9ch",
          maxWidth: "100%",
          filter: "none",
        }}
      >
        <span data-edition-name-from style={{ position: "absolute", inset: 0 }}>
          {name}
        </span>
        <span
          data-edition-name-to
          style={{ position: "absolute", inset: 0, opacity: 0 }}
        />
      </span>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter id={id} x="-30%" y="-60%" width="160%" height="220%">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -60"
            />
          </filter>
        </defs>
      </svg>
    </h2>
  );
}

export function paintEditionName(
  root: HTMLElement,
  names: string[],
  alphas: number[],
  reduced = false,
) {
  const from = root.querySelector<HTMLElement>("[data-edition-name-from]"),
    to = root.querySelector<HTMLElement>("[data-edition-name-to]");
  if (!from || !to) return;
  const visible = alphas
    .map((alpha, index) => ({ alpha, index }))
    .filter((a) => a.alpha > 0.001)
    .sort((a, b) => a.index - b.index);
  const first = visible[0],
    second = visible[1];
  if (!first) return;
  const face = from.parentElement;
  if (face)
    face.style.filter =
      second && !reduced
        ? `url(#${face.dataset.nameFilter}) blur(.2px)`
        : "none";
  const fraction = second ? second.alpha / (first.alpha + second.alpha) : 0;
  const set = (el: HTMLElement, name: string, amount: number) => {
    if (el.textContent !== name) el.textContent = name;
    el.style.opacity = String(Math.pow(amount, 0.4));
    el.style.filter =
      amount === 1
        ? "none"
        : `blur(${Math.min(1.5 / Math.max(0.001, amount) - 1.5, 8)}px)`;
  };
  if (reduced || !second) {
    set(from, names[first.index], 1);
    set(to, "", 0);
  } else {
    set(from, names[first.index], 1 - fraction);
    set(to, names[second.index], fraction);
  }
}
