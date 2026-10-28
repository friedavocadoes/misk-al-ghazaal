/** Temporary iPhone compatibility bridge; retirement instructions: AGENTS.md §37. */
// Set false ONLY after real-iPhone verification of the standard web-haptics path.
// This disables both overlays and the controller's imperative-pattern suppression.
export const IOS_DIRECT_TAP_ENABLED = true;

export function needsIOSHapticTap(nav: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints" | "vibrate">): boolean {
  return IOS_DIRECT_TAP_ENABLED && typeof nav.vibrate !== "function" &&
    (/iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1));
}

type TapTarget = HTMLButtonElement | HTMLAnchorElement;
/** Only explicitly opted-in controls are bridged; ARIA widgets keep native interaction. */
export function installIOSHapticTaps(enabled: () => boolean): () => void {
  if (typeof navigator === "undefined" || !needsIOSHapticTap(navigator)) return () => {};
  const entries = new Map<TapTarget, { input: HTMLInputElement; dispose: () => void }>();
  const pending = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;
  const actionable = (host: TapTarget) => host.isConnected &&
    !host.matches(':disabled,[aria-disabled="true"]') && !host.closest('[inert]');
  const eligible = (host: TapTarget) => enabled() && !document.hidden && actionable(host) &&
    !host.closest('[data-ios-haptic="off"]') &&
    !host.parentElement?.closest('[data-haptic="none"]');
  const attach = (host: TapTarget) => {
    if (entries.has(host) || host.matches('[aria-haspopup],[role]')) return;
    const position = host.style.position;
    const changedPosition = getComputedStyle(host).position === "static";
    if (changedPosition) host.style.position = "relative";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.setAttribute("data-ios-haptic-overlay", "");
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    // Native switch appearance is essential. No display:none / appearance:none.
    // clip-path keeps the transparent hit area inside the actual button corners.
    input.style.cssText = "position:absolute;inset:0;width:100%;height:100%;min-width:0;min-height:0;max-width:none;max-height:none;margin:0;padding:0;border:0;opacity:0;appearance:auto;-webkit-appearance:auto;z-index:2;cursor:inherit;touch-action:manipulation;clip-path:inset(0 round var(--ios-haptic-radius, 2px));";
    input.style.setProperty("--ios-haptic-radius", getComputedStyle(host).borderRadius || "2px");
    const down = (event: PointerEvent) => {
      // Let scroll gestures proceed. Never prevent pointerdown/touchstart.
      if (!eligible(host) || event.pointerType !== "touch") return;
      // Keep focus on the real accessible button, not the hidden implementation control.
      host.focus({ preventScroll: true });
    };
    const click = (event: MouseEvent) => {
      // The physical native toggle is the tick. Never prevent its default action.
      event.stopPropagation();
      if (!event.isTrusted || !eligible(host)) return;
      const timer = setTimeout(() => {
        pending.delete(timer);
        if (stopped || !actionable(host)) return;
        host.focus({ preventScroll: true });
        // Exactly one real button activation, preserving submit and disabled semantics.
        // Delay until the native switch has completed its trusted default action.
        host.click();
      }, 0);
      pending.add(timer);
    };
    input.addEventListener("pointerdown", down);
    input.addEventListener("click", click);
    host.appendChild(input);
    entries.set(host, { input, dispose: () => {
      input.removeEventListener("pointerdown", down);
      input.removeEventListener("click", click);
      input.remove();
      if (changedPosition && host.style.position === "relative") host.style.position = position;
    } });
  };
  const sync = () => {
    if (stopped) return;
    for (const [host, entry] of entries) {
      if (!host.isConnected || !host.hasAttribute("data-ios-haptic") || !host.contains(entry.input)) {
        entry.dispose(); entries.delete(host);
      }
    }
    document.querySelectorAll<TapTarget>('button[data-ios-haptic]:not([data-ios-haptic="off"]),a[data-ios-haptic]:not([data-ios-haptic="off"])').forEach(attach);
    for (const [host, { input }] of entries) {
      const active = eligible(host);
      if (input.disabled === active) input.disabled = !active;
      const pointerEvents = active ? "auto" : "none";
      if (input.style.pointerEvents !== pointerEvents) input.style.pointerEvents = pointerEvents;
    }
  };
  const observer = new MutationObserver(sync);
  // Ignore style writes/checked changes to avoid a mutation feedback loop.
  observer.observe(document.body, { childList: true, subtree: true, attributes: true,
    attributeFilter: ["disabled", "aria-disabled", "inert", "data-haptic", "data-ios-haptic"] });
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", sync);
  window.addEventListener("haptics-preference", sync);
  window.addEventListener("storage", sync);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    stopped = true;
    observer.disconnect();
    motion.removeEventListener("change", sync);
    window.removeEventListener("haptics-preference", sync);
    window.removeEventListener("storage", sync);
    document.removeEventListener("visibilitychange", sync);
    pending.forEach(clearTimeout);
    for (const entry of entries.values()) entry.dispose();
    entries.clear();
  };
}
