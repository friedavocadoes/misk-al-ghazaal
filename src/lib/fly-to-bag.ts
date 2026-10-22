// Fly-to-bag: a thumbnail ghost arcs from the tapped button into the
// navbar bag, then the badge pops. Native Web Animations API (no lib,
// GPU `transform` only, ~1250ms) with a reduced-motion bypass.

export function flyToBag(source: HTMLElement | null, image?: string) {
  if (typeof window === "undefined" || !source) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const s = source.getBoundingClientRect();
  if (!s.width) return;

  const ghost = image ? document.createElement("img") : document.createElement("div");
  if (ghost instanceof HTMLImageElement && image) {
    const cached=[...(document.images??[])].find(img=>img.complete&&(img.src===image||img.currentSrc.includes(encodeURIComponent(image))));
    ghost.src=cached?.currentSrc||image;
  }
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("data-fly-to-bag", "");
  const size = window.innerWidth < 640 ? 76 : 88;
  ghost.style.cssText = `position:fixed;left:${s.left + s.width / 2 - size / 2}px;top:${s.top + s.height / 2 - size / 2}px;width:${size}px;height:${size}px;object-fit:contain;background:#fffdf8;border:1px solid #bba57b66;border-radius:18px;pointer-events:none;z-index:100;opacity:0.95;box-shadow:0 12px 28px -10px rgba(28,25,23,0.5);${image ? "" : "background:#1c1917;"}`;
  document.body.appendChild(ghost);

  const done = () => {
    ghost.remove();
    window.dispatchEvent(new CustomEvent("bag-landed"));
  };

  const target = [...document.querySelectorAll<HTMLElement>("[data-bag-target]")].find(el => {
    const box=el.getBoundingClientRect();
    return box.width>0 && box.height>0 && box.right>0 && box.left<innerWidth && box.bottom>0 && box.top<innerHeight && getComputedStyle(el).visibility!=="hidden";
  });
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
  const arc=Math.min(110,Math.max(45,Math.abs(dx)*.22));
  const frames=Array.from({length:25},(_,i)=>{
    const progress=i/24;
    const x=dx*progress;
    const y=dy*progress-Math.sin(progress*Math.PI)*arc;
    const scale=progress<.22 ? 1+Math.sin(progress/.22*Math.PI)*.06 : 1-.82*Math.pow((progress-.22)/.78,1.8);
    return {transform:`translate3d(${x}px,${y}px,0) scale(${scale})`,opacity:progress<.82?1:1-(progress-.82)/.18*.8,offset:progress};
  });
  const anim=ghost.animate(frames,{duration:1250,easing:"cubic-bezier(.3,.05,.2,1)",fill:"forwards"});
  anim.onfinish=done;
  anim.oncancel=()=>ghost.remove();
}
