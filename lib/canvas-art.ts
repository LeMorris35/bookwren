// Canvas versions of the brand art, for generated images (share cards,
// Facebook assets). Mirrors the SVG shapes in components/WrenArt.tsx.

/**
 * next/font renames font families to private names ("__Fraunces_abc123"),
 * so canvas code asking for "Fraunces" silently falls back. This reads the
 * real family list off a .font-display element.
 */
export function displayFontFamily(): string {
  if (typeof document === "undefined") return "Georgia, serif";
  const el = document.createElement("span");
  el.className = "font-display";
  el.style.display = "none";
  document.body.appendChild(el);
  const fam = getComputedStyle(el).fontFamily;
  el.remove();
  return fam || "Georgia, serif";
}

export function bodyFontFamily(): string {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  const fam = getComputedStyle(document.body).fontFamily;
  return fam || "system-ui, sans-serif";
}

/** The wren-on-open-book mark. Draws in a 64×64 unit box scaled by `scale`. */
export function drawWrenOnBook(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  // bird (offset + scaled like the SVG)
  ctx.save();
  ctx.translate(9, 1);
  ctx.scale(0.78, 0.78);
  ctx.beginPath();
  ctx.moveTo(3, 25.5);
  ctx.lineTo(16, 22.5);
  ctx.lineTo(16, 28);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(21.5, 25, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(34, 38, 15.5, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(48, 38);
  ctx.rotate((30 * Math.PI) / 180);
  ctx.translate(-48, -38);
  ctx.beginPath();
  ctx.roundRect(45, 13, 6.5, 27, 3.2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // legs
  ctx.beginPath();
  ctx.roundRect(30, 39, 2.4, 11, 1.2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(38, 40, 2.4, 10, 1.2);
  ctx.fill();
  // open book
  ctx.beginPath();
  ctx.moveTo(4, 50);
  ctx.bezierCurveTo(12, 45.5, 24, 45.5, 32, 49);
  ctx.bezierCurveTo(40, 45.5, 52, 45.5, 60, 50);
  ctx.lineTo(60, 57);
  ctx.bezierCurveTo(52, 53.5, 40, 53.5, 32, 56.5);
  ctx.bezierCurveTo(24, 53.5, 12, 53.5, 4, 57);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A simple hedgerow band: branch, leaves, berries — spans `width` at (x, y). */
export function drawHedgerow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  colors: { bark: string; foliage: string; foliageDeep: string; berry: string }
) {
  ctx.save();
  ctx.translate(x, y);
  // branch
  ctx.strokeStyle = colors.bark;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(width * 0.25, -10, width * 0.5, -2);
  ctx.quadraticCurveTo(width * 0.75, 6, width, -4);
  ctx.stroke();

  const leaf = (lx: number, ly: number, rot: number, fill: string) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(11, -14, 25, 0);
    ctx.quadraticCurveTo(11, 11, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  const n = Math.max(4, Math.floor(width / 170));
  for (let i = 0; i < n; i++) {
    const lx = (width / n) * (i + 0.3);
    leaf(lx, -6, i % 2 === 0 ? -25 : 205, colors.foliage);
    if (i % 2 === 1) leaf(lx + 60, 4, 20, colors.foliageDeep);
  }
  ctx.fillStyle = colors.berry;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const bx = (width / n) * (i * 2 + 1.2);
    ctx.beginPath();
    ctx.arc(bx, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx + 10, 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
