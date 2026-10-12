// Fly-to-bag: a thumbnail ghost arcs from the tapped button into the
// navbar bag, then the badge pops. Native Web Animations API (no lib,
// GPU `transform` only, ~650ms) with a reduced-motion bypass.

export function flyToBag(source: HTMLElement | null, image?: string) {
  if (typeof window === "undefined" || !source) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const s = source.getBoundingClientRect();
  if (!s.width) return;

  const ghost = image ? document.createElement("img") : document.createElement("div");
  if (ghost instanceof HTMLImageElement && image) ghost.src = image;
  ghost.setAttribute("aria-hidden", "true");
  const size = 54;
  ghost.style.cssText = `position:fixed;left:${s.left + s.width / 2 - size / 2}px;top:${s.top + s.height / 2 - size / 2}px;width:${size}px;height:${size}px;object-fit:cover;border-radius:9999px;pointer-events:none;z-index:100;opacity:0.95;box-shadow:0 12px 28px -10px rgba(28,25,23,0.5);${image ? "" : "background:#1c1917;"}`;
  document.body.appendChild(ghost);

  const done = () => {
    ghost.remove();
    window.dispatchEvent(new CustomEvent("bag-landed"));
  };

  const target = document.querySelector("[data-bag-target]") as HTMLElement | null;
  if (!target) {
    const fall = ghost.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 0.95 },
        { transform: "translate(0,-44px) scale(0.6)", opacity: 0 },
      ],
      { duration: 420, easing: "cubic-bezier(0.22,1,0.36,1)" },
    );
    fall.onfinish = done;
    return;
  }
  const t = target.getBoundingClientRect();
  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 0.95 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 56}px) scale(0.55)`, opacity: 0.9, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.35 },
    ],
    { duration: 650, easing: "cubic-bezier(0.22,1,0.36,1)" },
  );
  anim.onfinish = done;
}
