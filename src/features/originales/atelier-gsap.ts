let engine:
  | Promise<{
      gsap: typeof import("gsap").gsap;
      Flip: typeof import("gsap/Flip").Flip;
    }>
  | undefined;

/** Only requested by capsule client effects. Share registration, not animation instances. */
export function atelierGsap() {
  return (engine ??= Promise.all([
    import("gsap"),
    import("gsap/MorphSVGPlugin"),
    import("gsap/DrawSVGPlugin"),
    import("gsap/Flip"),
  ]).then(([{ gsap }, { MorphSVGPlugin }, { DrawSVGPlugin }, { Flip }]) => {
    gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin, Flip);
    return { gsap, Flip };
  }));
}
