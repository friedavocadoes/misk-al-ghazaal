declare module "threejs-components/build/backgrounds/liquid1.min.js" {
  export interface LiquidApp {
    loadImage(src: string): Promise<void>;
    setRain(enabled: boolean): void;
    dispose(): void;
    liquidPlane: {
      material: {
        metalness: number;
        roughness: number;
        map?: { dispose(): void };
      };
      uniforms: { displacementScale: { value: number } };
    };
    three: {
      isDisposed: boolean;
      maxPixelRatio: number;
      resize(): void;
      render(): void;
      onBeforeRender(time: { elapsed: number; delta: number }): void;
      renderer: { forceContextLoss(): void };
    };
  }
  export default function LiquidBackground(
    canvas: HTMLCanvasElement,
  ): LiquidApp;
}
