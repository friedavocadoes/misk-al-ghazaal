export type StudioPalette = { ink: string; accent: string; wash: string };

// Each sheet has its own silhouette, light angle and phase.
const sheets = [
  { start: -0.05, end: 0.34, bend: 0.31, depth: 0.19, phase: 0.4 },
  { start: 0.56, end: 0.06, bend: -0.21, depth: 0.23, phase: 2.1 },
  { start: 0.86, end: 0.38, bend: 0.19, depth: 0.15, phase: 3.9 },
];

const forms: Record<string, typeof sheets> = {
  // Tall green folds, crossing rose silk, and low, parallel sapphire currents.
  "02": [
    { start: -0.02, end: 0.22, bend: 0.32, depth: 0.12, phase: 1.7 },
    { start: 0.32, end: 0.53, bend: 0.38, depth: 0.16, phase: 2.4 },
    { start: 0.64, end: 0.89, bend: 0.24, depth: 0.21, phase: 3.3 },
  ],
  "03": [
    { start: 0.07, end: 0.82, bend: -0.37, depth: 0.25, phase: 1.2 },
    { start: 0.74, end: 0.14, bend: -0.57, depth: 0.33, phase: 3.1 },
    { start: 0.96, end: 0.66, bend: 0.29, depth: 0.18, phase: 4.8 },
  ],
  "04": [
    { start: 0.26, end: 0.34, bend: 0.22, depth: 0.1, phase: 0.3 },
    { start: 0.53, end: 0.58, bend: 0.32, depth: 0.14, phase: 1.8 },
    { start: 0.79, end: 0.83, bend: 0.29, depth: 0.15, phase: 3.5 },
  ],
};

const collectionLights = ["#bb8757", "#5a9b79", "#b5698b", "#628bb8"];

export function paintStudio(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { ink, accent, wash }: StudioPalette,
  time = 0,
  pointerX = 0,
  pointerY = 0,
  opening = 1,
  variant = "01",
  trace?: (index: number, path: string, highlight: number) => void,
) {
  const backdrop = ctx.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, ink);
  backdrop.addColorStop(0.55, "#17141a");
  backdrop.addColorStop(1, ink);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  if (variant === "collection") {
    // Four pools of light share a graphite stage, one for each bottle.
    for (const [index, color] of collectionLights.entries()) {
      const x =
        width *
        ((index + 0.5) / 4 +
          Math.sin(time * 0.21 + index) * 0.024 +
          pointerX * 0.025);
      const y = height * (0.55 + pointerY * 0.05);
      const radius = Math.max(width * 0.24, height * 0.27);
      const pool = ctx.createRadialGradient(x, y, 0, x, y, radius);
      pool.addColorStop(0, `${color}67`);
      pool.addColorStop(0.5, `${color}2c`);
      pool.addColorStop(1, `${color}00`);
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, width, height);
    }
    const ground = ctx.createLinearGradient(0, height * 0.68, 0, height);
    ground.addColorStop(0, "#11131a00");
    ground.addColorStop(1, "#11131add");
    ctx.fillStyle = ground;
    ctx.fillRect(0, height * 0.68, width, height * 0.32);
    return;
  }

  const light = ctx.createRadialGradient(
    width * (0.33 + pointerX * 0.07),
    height * 0.34,
    0,
    width * 0.42,
    height * 0.36,
    width * 0.67,
  );
  light.addColorStop(0, `${wash}52`);
  light.addColorStop(0.45, `${accent}54`);
  light.addColorStop(1, `${accent}00`);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  const stageWidth = width;
  const stageHeight = height;
  ctx.save();
  if (variant === "02") {
    ctx.transform(0, 1, -1, 0, width, 0);
    [width, height] = [height, width];
  }
  for (const [index, { start, end, bend, depth, phase }] of (
    forms[variant] ?? sheets
  ).entries()) {
    const entry =
      1 -
      Math.pow(
        1 - Math.max(0, (opening - index * 0.09) / (1 - index * 0.09)),
        3,
      );
    const fold = (1 - entry) * (index === 1 ? -0.37 : 0.46);
    const drift = Math.sin(time * 0.38 + phase) * 0.038;
    const sway = Math.cos(time * 0.29 + phase) * 0.055;
    const x1 = width * (0.25 + pointerX * 0.07);
    const x2 = width * (0.75 + pointerX * 0.09);
    const y1 = height * (start + bend + drift + pointerY * 0.08 + fold);
    const y2 = height * (end - bend * 0.55 + sway + pointerY * 0.11 - fold);
    const left = height * (start + sway * 0.4 + fold);
    const right = height * (end - drift * 0.5 - fold);
    const thickness = height * depth;

    const surface = ctx.createLinearGradient(0, left, width, right + thickness);
    surface.addColorStop(0, `${accent}46`);
    surface.addColorStop(0.27, `${wash}40`);
    surface.addColorStop(0.53, `${ink}20`);
    surface.addColorStop(0.76, `${wash}50`);
    surface.addColorStop(1, `${accent}22`);
    ctx.beginPath();
    ctx.moveTo(-4, left);
    ctx.bezierCurveTo(x1, y1, x2, y2, width + 4, right);
    ctx.lineTo(width + 4, right + thickness * 0.55);
    ctx.bezierCurveTo(
      x2,
      y2 + thickness * 1.35,
      x1,
      y1 + thickness * 0.55,
      -4,
      left + thickness,
    );
    ctx.closePath();
    ctx.globalAlpha = 0.18 + entry * 0.82;
    ctx.fillStyle = surface;
    ctx.fill();

    const glint = 0.45 + Math.sin(time * 0.25 + phase) * 0.21 + pointerX * 0.09;
    const rest = 1 - glint;
    const highlightY =
      rest ** 3 * left +
      3 * rest ** 2 * glint * y1 +
      3 * rest * glint ** 2 * y2 +
      glint ** 3 * right +
      thickness * 0.18;
    const polish = ctx.createRadialGradient(
      width * glint,
      highlightY,
      0,
      width * glint,
      highlightY,
      width * 0.21,
    );
    polish.addColorStop(0, `${wash}3c`);
    polish.addColorStop(0.48, `${accent}23`);
    polish.addColorStop(1, `${accent}00`);
    ctx.fillStyle = polish;
    ctx.fill();

    // One continuous grazing highlight along the moving lip of the glass.
    const rim = ctx.createLinearGradient(0, 0, width, 0);
    rim.addColorStop(0, `${wash}20`);
    rim.addColorStop(Math.max(0.05, glint - 0.18), `${wash}24`);
    rim.addColorStop(glint, `${wash}c4`);
    rim.addColorStop(Math.min(0.95, glint + 0.17), `${wash}28`);
    rim.addColorStop(1, `${wash}10`);
    ctx.beginPath();
    ctx.moveTo(-4, left);
    ctx.bezierCurveTo(x1, y1, x2, y2, width + 4, right);
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(2, height * 0.008);
    ctx.globalAlpha = entry * 0.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (trace) {
      trace(
        index,
        `M-4 ${left} C${x1} ${y1} ${x2} ${y2} ${width + 4} ${right}`,
        glint,
      );
    } else {
      ctx.lineWidth = Math.max(0.75, height * 0.0016);
      ctx.stroke();
    }
  }

  ctx.restore();
  const floor = ctx.createLinearGradient(0, stageHeight * 0.76, 0, stageHeight);
  floor.addColorStop(0, `${ink}00`);
  floor.addColorStop(0.54, `${ink}8c`);
  floor.addColorStop(0.66, `${accent}58`);
  floor.addColorStop(1, ink);
  ctx.fillStyle = floor;
  ctx.fillRect(0, stageHeight * 0.76, stageWidth, stageHeight * 0.24);
}
