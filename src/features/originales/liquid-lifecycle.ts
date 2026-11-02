/** v0.0.22 removes fresh .bind() callbacks rather than its registered callbacks.
 * Capture only synchronous factory registrations, restore native methods immediately,
 * then release those exact listeners alongside the engine's own dispose(). */
export function captureLiquidListeners<T>(
  targets: EventTarget[],
  create: () => T,
) {
  const listeners: Array<{
    target: EventTarget;
    type: string;
    callback: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];
  const restore = targets.map((target) => {
    const own = Object.getOwnPropertyDescriptor(target, "addEventListener");
    const add = target.addEventListener;
    target.addEventListener = function (type, callback, options) {
      if (callback) listeners.push({ target: this, type, callback, options });
      return add.call(this, type, callback, options);
    };
    return () => {
      if (own) Object.defineProperty(target, "addEventListener", own);
      else Reflect.deleteProperty(target, "addEventListener");
    };
  });
  const release = () => {
    for (const { target, type, callback, options } of listeners.splice(0))
      target.removeEventListener(type, callback, options);
  };
  try {
    return { value: create(), release };
  } catch (error) {
    release();
    throw error;
  } finally {
    restore.forEach((fn) => fn());
  }
}
/** One pointer ripple injection per native animation frame; clicks keep priority. */
export function liquidDropQueue(
  draw: (x: number, y: number, radius: number, strength: number) => void,
) {
  let pending: [number, number, number, number] | undefined;
  return {
    add(x: number, y: number, radius: number, strength: number) {
      if (!pending || strength >= pending[3])
        pending = [x, y, radius, strength];
    },
    flush() {
      const drop = pending;
      pending = undefined;
      if (drop) draw(...drop);
    },
  };
}
