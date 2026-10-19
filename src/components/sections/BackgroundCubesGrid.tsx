"use client";
// Adapted from Aceternity UI background-cubes-grid registry (isometric variant).
// https://ui.aceternity.com/registry/background-cubes-grid-demo.json

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useAnimationFrame, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Isometric variant: a flat field of cubes that ripples under the pointer.   */
/* -------------------------------------------------------------------------- */

const SIM_HZ = 120;
const STEP = 1 / SIM_HZ;
const BRUSH_RADIUS = 1.1;
const PUSH_PER_CELL = 0.16;

export type IsometricCubesProps = {
  variant?: "isometric";
  className?: string;
  /** On-screen width of one tile, in CSS pixels. */
  cellSize?: number;
  /** Seam between cubes, as a fraction of a tile. */
  gap?: number;
  /** Top face color. */
  topColor?: string;
  /** Left side face color. */
  leftColor?: string;
  /** Right side face color. */
  rightColor?: string;
  /** Wave height, in tiles. */
  amplitude?: number;
  /** Wave speed, in tiles per second. */
  speed?: number;
  /** Fraction of wave energy kept per second, from 0 to 1. Lower values settle faster. */
  damping?: number;
  /** Drop random ripples when the pointer stops. */
  idleRipples?: boolean;
  /** Seconds the grid stays flat and still before random ripples start. */
  idleDelay?: number;
  /** Color of the light that follows the ripple. */
  glowColor?: string;
  /** Glow strength. Use 0 to turn it off. */
  glow?: number;
};

const isoVertexShader = `
  attribute vec2 aOffset;
  attribute float aHeight;
  attribute float aGlow;
  uniform float uAmplitude;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vGlow;
  varying float vDepth;

  void main() {
    vec3 p = position;
    p.xz += aOffset;
    // Crests round off softly; troughs have no limit and sink deeper than crests rise.
    // The two curves blend smoothly around zero, so cubes never change speed as they pass rest.
    float x = aHeight;
    vHeight = mix( x * 1.5, tanh( x ), smoothstep( -0.6, 0.6, x ) );
    p.y += vHeight * uAmplitude;
    vNormal = normal;
    vGlow = aGlow;
    vDepth = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
  }
`;

const isoFragmentShader = `
  uniform vec3 uTop;
  uniform vec3 uLeft;
  uniform vec3 uRight;
  uniform vec3 uGlowColor;
  uniform float uGlow;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vGlow;
  varying float vDepth;

  void main() {
    bool isTop = vNormal.y > 0.5;
    vec3 color = isTop ? uTop : ( abs( vNormal.x ) > 0.5 ? uLeft : uRight );
    // Tops that sink below the surface pick up a little shade so the trough reads.
    if ( isTop ) color = mix( color, uLeft, clamp( -vHeight, 0.0, 1.0 ) * 0.6 );

    // Glow: tops get a soft tint; sides are lit hardest near the rim, like a box-shadow.
    float glow = clamp( vGlow * uGlow, 0.0, 1.0 );
    float falloff = isTop ? 0.2 : exp( vDepth * 1.6 ) * 0.6;
    color = mix( color, uGlowColor, glow * falloff );

    gl_FragColor = vec4( color, 1.0 );
    #include <colorspace_fragment>
  }
`;

function createIsometricScene(
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  options: Required<Omit<IsometricCubesProps, "className" | "variant">>,
) {
  const {
    cellSize,
    gap,
    topColor,
    leftColor,
    rightColor,
    amplitude,
    speed,
    damping,
    idleRipples,
    idleDelay,
    glowColor,
    glow,
  } = options;

  const c2 = Math.min((speed / SIM_HZ) ** 2, 0.5);
  // Per-second rates. While the pointer moves (or auto mode runs), waves travel freely and a
  // slow pull toward zero removes leftover offset. Once the pointer stops, both rates ramp up
  // smoothly so the surface eases back into a flat, aligned grid without a sudden brake.
  const flowDrag = -Math.log(Math.min(Math.max(damping, 1e-4), 1));
  const settleDrag = -Math.log(0.02);
  const flowPull = 0.8;
  const settlePull = 3.5;
  const SETTLE_AFTER = 0.15;
  const SETTLE_RAMP = 0.8;
  const FLAT = 0.004;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(topColor);
  const scene = new THREE.Scene();

  // True isometric view: camera on the (1, 1, 1) diagonal.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader: isoVertexShader,
    fragmentShader: isoFragmentShader,
    uniforms: {
      uAmplitude: { value: amplitude },
      uTop: { value: new THREE.Color(topColor) },
      uLeft: { value: new THREE.Color(leftColor) },
      uRight: { value: new THREE.Color(rightColor) },
      uGlowColor: { value: new THREE.Color(glowColor) },
      uGlow: { value: glow },
    },
  });

  let size = 0;
  let height = new Float32Array(0);
  let velocity = new Float32Array(0);
  let lastHeight = new Float32Array(0);
  let glowField = new Float32Array(0);
  let geometry: THREE.InstancedBufferGeometry | null = null;
  let heightAttribute: THREE.InstancedBufferAttribute | null = null;
  let glowAttribute: THREE.InstancedBufferAttribute | null = null;
  let mesh: THREE.Mesh | null = null;

  const build = (count: number) => {
    if (mesh) scene.remove(mesh);
    geometry?.dispose();
    size = count;
    height = new Float32Array(size * size);
    velocity = new Float32Array(size * size);
    lastHeight = new Float32Array(size * size);
    glowField = new Float32Array(size * size);

    // Tall columns so deep troughs never expose the bottom of a cube.
    const box = new THREE.BoxGeometry(1 - gap, 16, 1 - gap).translate(0, -8, 0);
    geometry = new THREE.InstancedBufferGeometry();
    geometry.index = box.index;
    geometry.setAttribute("position", box.getAttribute("position"));
    geometry.setAttribute("normal", box.getAttribute("normal"));

    const offsets = new Float32Array(size * size * 2);
    const half = (size - 1) / 2;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        offsets[(i * size + j) * 2] = i - half;
        offsets[(i * size + j) * 2 + 1] = j - half;
      }
    }
    geometry.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 2));
    heightAttribute = new THREE.InstancedBufferAttribute(new Float32Array(size * size), 1);
    heightAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aHeight", heightAttribute);
    glowAttribute = new THREE.InstancedBufferAttribute(glowField, 1);
    glowAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aGlow", glowAttribute);
    geometry.instanceCount = size * size;

    mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
  };

  let awake = true;
  const resize = () => {
    const width = container.clientWidth;
    const viewHeight = container.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, viewHeight, false);

    // A tile's top face spans sqrt(2) world units across the screen.
    const scale = cellSize / Math.SQRT2;
    camera.left = -width / 2 / scale;
    camera.right = width / 2 / scale;
    camera.top = viewHeight / 2 / scale;
    camera.bottom = -viewHeight / 2 / scale;
    camera.updateProjectionMatrix();

    const needed = Math.ceil(((width + viewHeight * 2) / cellSize) * 1.1) + 4;
    if (needed > size) build(needed);
    awake = true;
  };

  // Smooth Gaussian push into the velocity field, centred on a fractional grid position.
  const brush = (gx: number, gz: number, strength: number, radius = BRUSH_RADIUS) => {
    const reach = Math.ceil(radius * 3);
    const inv = 1 / (2 * radius * radius);
    const ci = Math.round(gx);
    const cj = Math.round(gz);
    for (let i = Math.max(1, ci - reach); i <= Math.min(size - 2, ci + reach); i++) {
      for (let j = Math.max(1, cj - reach); j <= Math.min(size - 2, cj + reach); j++) {
        const dx = i - gx;
        const dz = j - gz;
        velocity[i * size + j] -= strength * Math.exp(-(dx * dx + dz * dz) * inv);
      }
    }
    awake = true;
  };

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  let target: { x: number; z: number } | null = null;
  let brushAt: { x: number; z: number } | null = null;
  let idleTime = 0;
  let quietTime = 0;
  let idleTimer = 0;
  let autoMode = false;
  let lastEnergy = 0;

  // Listen on window so content placed above the canvas does not block ripples.
  const onPointerMove = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (Math.abs(nx) > 1 || Math.abs(ny) > 1) {
      target = null;
      brushAt = null;
      return;
    }
    pointer.set(nx, ny);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.ray.intersectPlane(ground, hit)) return;
    const half = (size - 1) / 2;
    target = { x: hit.x + half, z: hit.z + half };
    idleTime = 0;
    quietTime = 0;
    autoMode = false;
  };

  // Drag the brush along the path the pointer travelled since the last frame.
  const applyPointer = () => {
    if (!target) return;
    if (!brushAt) {
      brushAt = { ...target };
      return;
    }
    const dx = target.x - brushAt.x;
    const dz = target.z - brushAt.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.01) return;
    const samples = Math.ceil(distance / 0.35);
    const push = (Math.min(distance, 3) * PUSH_PER_CELL) / samples;
    for (let s = 1; s <= samples; s++) {
      brush(brushAt.x + (dx * s) / samples, brushAt.z + (dz * s) / samples, push);
    }
    brushAt = { ...target };
  };

  const step = () => {
    const ramp = autoMode ? 0 : Math.min(Math.max((idleTime - SETTLE_AFTER) / SETTLE_RAMP, 0), 1);
    const s = ramp * ramp * (3 - 2 * ramp);
    const keep = Math.exp(-(flowDrag + (settleDrag - flowDrag) * s) / SIM_HZ);
    const relax = Math.exp(-(flowPull + (settlePull - flowPull) * s) / SIM_HZ);
    lastHeight.set(height);
    for (let i = 1; i < size - 1; i++) {
      for (let j = 1; j < size - 1; j++) {
        const k = i * size + j;
        // Nine-point Laplacian: round wavefronts and no grid-aligned checkerboard noise.
        const edges = height[k - 1] + height[k + 1] + height[k - size] + height[k + size];
        const corners =
          height[k - size - 1] + height[k - size + 1] + height[k + size - 1] + height[k + size + 1];
        const laplacian = (4 * edges + corners - 20 * height[k]) / 6;
        velocity[k] = (velocity[k] + c2 * laplacian) * keep;
      }
    }
    for (let k = 0; k < height.length; k++) height[k] = (height[k] + velocity[k]) * relax;

    // Glow eases toward the local wave energy: quick to light up, slow to fade.
    for (let i = 1; i < size - 1; i++) {
      for (let j = 1; j < size - 1; j++) {
        const k = i * size + j;
        const energy =
          (Math.abs(height[k]) * 4 +
            Math.abs(height[k - 1]) +
            Math.abs(height[k + 1]) +
            Math.abs(height[k - size]) +
            Math.abs(height[k + size])) /
          8;
        glowField[k] += (energy - glowField[k]) * (energy > glowField[k] ? 0.08 : 0.015);
      }
    }
  };

  let accumulator = 0;
  const update = (delta: number) => {
    if (!heightAttribute || !glowAttribute) return;

    idleTime += delta;
    // Auto mode starts only after the grid has been flat and still for `idleDelay` seconds.
    quietTime = !autoMode && idleTime > SETTLE_AFTER && lastEnergy < FLAT ? quietTime + delta : 0;
    if (idleRipples && !autoMode && quietTime > idleDelay) autoMode = true;
    if (autoMode) {
      idleTimer += delta;
      if (idleTimer > 1.8) {
        idleTimer = 0;
        const spread = size * 0.15;
        brush(
          size / 2 + (Math.random() - 0.5) * spread * 2,
          size / 2 + (Math.random() - 0.5) * spread * 2,
          0.28,
          1.8,
        );
      }
    } else {
      idleTimer = 1.8;
    }

    applyPointer();
    if (!awake) {
      lastEnergy = 0;
      return;
    }

    accumulator = Math.min(accumulator + delta, STEP * 8);
    while (accumulator >= STEP) {
      step();
      accumulator -= STEP;
    }

    // Blend the last two simulation states so motion stays smooth at any refresh rate.
    const alpha = accumulator / STEP;
    const display = heightAttribute.array as Float32Array;
    let wave = 0;
    let light = 0;
    for (let k = 0; k < height.length; k++) {
      display[k] = lastHeight[k] + (height[k] - lastHeight[k]) * alpha;
      wave = Math.max(wave, Math.abs(height[k]), Math.abs(velocity[k]) * 20);
      light = Math.max(light, glowField[k]);
    }
    heightAttribute.needsUpdate = true;
    glowAttribute.needsUpdate = true;
    renderer.render(scene, camera);
    lastEnergy = wave;
    const energy = Math.max(wave, light);

    // Stop rendering once the surface has settled; the next push wakes it up.
    if (energy < 1e-4) awake = false;
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  window.addEventListener("pointermove", onPointerMove);

  const dispose = () => {
    observer.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    geometry?.dispose();
    material.dispose();
    renderer.dispose();
  };

  return { update, dispose };
}

export function BackgroundCubesGrid({
  className,
  cellSize = 150,
  gap = 0.025,
  topColor = "#fafaf9",
  leftColor = "#e7e5e4",
  rightColor = "#d6d3d1",
  amplitude = 0.7,
  speed = 7,
  damping = 0.08,
  idleRipples = true,
  idleDelay = 1.5,
  glowColor = "#a8a29e",
  glow = 0.5,
}: IsometricCubesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const updateRef = useRef<((delta: number) => void) | null>(null);
  const reduceMotion = useReducedMotion();
  const visibleRef = useRef(true);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; });
    observer.observe(el); return () => observer.disconnect();
  }, []);
  const idle = idleRipples && !reduceMotion;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    if (reduceMotion) return;
    let scene: ReturnType<typeof createIsometricScene>;
    try { scene = createIsometricScene(canvasRef.current, containerRef.current, {
      cellSize,
      gap,
      topColor,
      leftColor,
      rightColor,
      amplitude,
      speed,
      damping,
      idleRipples: idle,
      idleDelay,
      glowColor,
      glow,
    });
    } catch { return; } // Static CSS background remains usable without WebGL.
    const { update, dispose } = scene;
    updateRef.current = update;
    return () => {
      updateRef.current = null;
      dispose();
    };
  }, [cellSize, gap, topColor, leftColor, rightColor, amplitude, speed, damping, idle, idleDelay, glowColor, glow, reduceMotion]);

  useAnimationFrame((_, delta) => {
    if (!document.hidden && visibleRef.current) updateRef.current?.(Math.min(delta / 1000, 0.1));
  });

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{ backgroundColor: topColor }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
