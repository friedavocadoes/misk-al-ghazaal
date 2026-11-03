export type StudioPalette = { ink: string; accent: string; wash: string };

// Each sheet has its own silhouette, light angle and phase.
const sheets = [
  { start: -0.05, end: 0.34, bend: 0.31, depth: 0.19, phase: 0.4 },
  { start: 0.56, end: 0.06, bend: -0.21, depth: 0.23, phase: 2.1 },
  { start: 0.86, end: 0.38, bend: 0.19, depth: 0.15, phase: 3.9 },
];

export function paintStudio(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  { ink, accent, wash }: StudioPalette,
  time = 0,
  pointerX = 0,
  pointerY = 0,
  opening = 1,
  trace?: (index: number, path: string, highlight: number) => void,
) {
  const backdrop = ctx.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, ink);
  backdrop.addColorStop(0.55, "#17141a");
  backdrop.addColorStop(1, ink);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

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

  for (const [index, { start, end, bend, depth, phase }] of sheets.entries()) {
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

  const floor = ctx.createLinearGradient(0, height * 0.76, 0, height);
  floor.addColorStop(0, `${ink}00`);
  floor.addColorStop(0.54, `${ink}8c`);
  floor.addColorStop(0.66, `${accent}58`);
  floor.addColorStop(1, ink);
  ctx.fillStyle = floor;
  ctx.fillRect(0, height * 0.76, width, height * 0.24);
}
