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
    import("gsap/CustomEase"),
  ]).then(
    ([
      { gsap },
      { MorphSVGPlugin },
      { DrawSVGPlugin },
      { Flip },
      { CustomEase },
    ]) => {
      gsap.registerPlugin(MorphSVGPlugin, DrawSVGPlugin, Flip, CustomEase);
      CustomEase.create("atelier-settle", "0.22,0.75,0.18,1");
      CustomEase.create("atelier-soft", "0.45,0,0.2,1");
      CustomEase.create("atelier-name", "0.25,0.4,0.75,0.6");
      return { gsap, Flip };
    },
  ));
}
