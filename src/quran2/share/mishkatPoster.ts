/**
 * «القرآن الكريم» — an ayah as an image, in the «مشكاة» design (docs/QURAN_V2_DESIGN.md):
 * the ayah inside a niche drawn in gold hairlines, its lamp lit at the top, a
 * vine of leaves (as around the Madina mushaf's pages) glowing only around the
 * light, the surah and ayah in a small cartouche with two rosettes under it. Two palettes (ليل، سَحَر), three sizes.
 */

export type MishkatPalette = "night" | "dawn";
export type MishkatFormat = "portrait" | "story" | "square";

export const MISHKAT_PALETTES: Array<{ id: MishkatPalette; label: string; swatch: string }> = [
  { id: "night", label: "ليل", swatch: "linear-gradient(160deg,#13211d,#070c0b 70%)" },
  { id: "dawn", label: "سَحَر", swatch: "linear-gradient(160deg,#fffaf0,#efe6d2 70%)" },
];

export const MISHKAT_FORMATS: Array<{ id: MishkatFormat; label: string; w: number; h: number }> = [
  { id: "portrait", label: "منشور", w: 1080, h: 1350 },
  { id: "story", label: "قصة", w: 1080, h: 1920 },
  { id: "square", label: "مربع", w: 1080, h: 1080 },
];

const COLORS: Record<MishkatPalette, { top: string; bottom: string; ink: string; soft: string; gold: string; lamp: string; niche: string }> = {
  night: { top: "#0d1a16", bottom: "#050908", ink: "#efe7d4", soft: "rgba(239,231,212,0.62)", gold: "#d8b56a", lamp: "#e9c46a", niche: "rgba(255,255,255,0.035)" },
  dawn: { top: "#fbf6ea", bottom: "#ece2cb", ink: "#1b1712", soft: "rgba(27,23,18,0.6)", gold: "#a8822f", lamp: "#f2cf83", niche: "rgba(255,255,255,0.55)" },
};

export type MishkatContent = { text: string; surahName: string; ayah: number; translation?: string };

const AR = "٠١٢٣٤٥٦٧٨٩";
const arDigits = (n: number | string) => String(n).replace(/\d/g, (d) => AR[Number(d)]!);

/** The arch, scaled into a box (x, y, w, h). */
function archPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const sx = w / 100;
  const sy = h / 140;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + 60 * sy);
  ctx.bezierCurveTo(x, y + 30 * sy, x + 20 * sx, y + 12 * sy, x + 50 * sx, y);
  ctx.bezierCurveTo(x + 80 * sx, y + 12 * sy, x + 100 * sx, y + 30 * sy, x + 100 * sx, y + 60 * sy);
  ctx.lineTo(x + 100 * sx, y + h);
  ctx.closePath();
}

/** A rosette of eight rounded petals, the flower of the mushaf's border. */
function rosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((Math.PI / 4) * i);
    ctx.globalAlpha = i % 2 ? 0.7 : 1;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.52, r * 0.22, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** A leaf, pointing along `angle`. */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.3, -size * 0.34, size * 0.8, -size * 0.36, size, 0);
  ctx.bezierCurveTo(size * 0.8, size * 0.36, size * 0.3, size * 0.34, 0, 0);
  ctx.fill();
  ctx.restore();
}

/** The vine: rows of a waving stem with its leaves, faded out away from (cx, cy). */
function lattice(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number, radius: number, color: string) {
  const period = 120;
  const amp = 16;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let row = 0, y = 40; y < h + period; y += 84, row++) {
    const shift = row % 2 ? period / 2 : 0;
    for (let x = -period + shift; x < w + period; x += period / 2) {
      const mid = x + period / 4;
      const d = Math.hypot(mid - cx, y - cy);
      const alpha = Math.max(0, 1 - d / radius);
      if (alpha <= 0.02) continue;
      const up = Math.round((x - shift) / (period / 2)) % 2 === 0;
      const dir = up ? -1 : 1;
      ctx.globalAlpha = alpha * 0.34;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + period * 0.12, y + dir * amp * 1.3, x + period * 0.38, y + dir * amp * 1.3, x + period / 2, y);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.26;
      leaf(ctx, mid, y + dir * amp, up ? -Math.PI * 0.8 : Math.PI * 0.2, 16);
      leaf(ctx, mid, y + dir * amp, up ? -Math.PI * 0.2 : Math.PI * 0.8, 16);
    }
  }
  ctx.restore();
}

/** Split words into lines that fit `max` width (right to left). */
function wrap(ctx: CanvasRenderingContext2D, words: string[], max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function ensurePosterFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('60px "Amiri Quran"'),
      document.fonts.load('40px "Reem Kufi"'),
      document.fonts.load('700 40px "Amiri"'),
    ]);
  } catch {
    // Fallback fonts still draw.
  }
}

export function drawMishkatPoster(content: MishkatContent, palette: MishkatPalette = "night", format: MishkatFormat = "portrait"): HTMLCanvasElement {
  const fmt = MISHKAT_FORMATS.find((f) => f.id === format)!;
  const { w, h } = fmt;
  const c = COLORS[palette];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = "rtl";

  // Ground.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, c.top);
  bg.addColorStop(1, c.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // The niche.
  const margin = 92;
  const nx = margin;
  const ny = format === "story" ? 230 : 96;
  const nw = w - margin * 2;
  const nh = h - ny - (format === "story" ? 330 : 190);
  const lampX = w / 2;
  const lampY = ny + nh * 0.13;

  ctx.save();
  archPath(ctx, nx, ny, nw, nh);
  ctx.clip();
  ctx.fillStyle = c.niche;
  ctx.fillRect(nx, ny, nw, nh);
  const glow = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, nw * 0.62);
  glow.addColorStop(0, palette === "night" ? "rgba(233,196,106,0.42)" : "rgba(242,207,131,0.6)");
  glow.addColorStop(1, "rgba(233,196,106,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(nx, ny, nw, nh);
  lattice(ctx, w, h, lampX, lampY, nw * 0.55, c.gold);
  ctx.restore();

  ctx.strokeStyle = c.gold;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.4;
  archPath(ctx, nx, ny, nw, nh);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.6;
  archPath(ctx, nx + 16, ny + 18, nw - 32, nh - 22);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The lamp: a chain from the apex, a glass vessel, lit.
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lampX, ny + 8);
  ctx.lineTo(lampX, lampY - 34);
  ctx.stroke();
  const vessel = ctx.createRadialGradient(lampX, lampY + 4, 2, lampX, lampY + 4, 36);
  vessel.addColorStop(0, "#fff8e1");
  vessel.addColorStop(0.6, c.lamp);
  vessel.addColorStop(1, c.gold);
  ctx.fillStyle = vessel;
  ctx.beginPath();
  ctx.moveTo(lampX - 20, lampY - 26);
  ctx.bezierCurveTo(lampX - 44, lampY - 8, lampX - 40, lampY + 34, lampX, lampY + 40);
  ctx.bezierCurveTo(lampX + 40, lampY + 34, lampX + 44, lampY - 8, lampX + 20, lampY - 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.gold;
  ctx.fillRect(lampX - 26, lampY - 34, 52, 8);

  // The ayah, fitted into the niche below the lamp.
  const words = content.text.split(/\s+/).filter(Boolean);
  const boxTop = lampY + 90;
  const boxBottom = ny + nh - 70;
  const boxW = nw - 120;
  let size = 76;
  let lines: string[] = [];
  for (; size >= 30; size -= 2) {
    ctx.font = `${size}px "Amiri Quran", "Amiri", serif`;
    lines = wrap(ctx, words, boxW);
    if (lines.length * size * 2.05 <= boxBottom - boxTop) break;
  }
  const lh = size * 2.05;
  const blockH = lines.length * lh;
  let y = boxTop + (boxBottom - boxTop - blockH) / 2 + lh * 0.62;
  ctx.fillStyle = c.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const line of lines) {
    ctx.fillText(line, w / 2, y);
    y += lh;
  }

  // The cartouche: the surah and the ayah, between two rosettes.
  const label = `سورة ${content.surahName}، الآية ${arDigits(content.ayah)}`;
  ctx.font = `500 38px "Reem Kufi", "Amiri", sans-serif`;
  const lw = ctx.measureText(label).width + 110;
  const cy = ny + nh + 70;
  ctx.strokeStyle = c.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(w / 2 - lw / 2, cy - 42, lw, 84, 42);
  ctx.stroke();
  ctx.fillStyle = c.gold;
  rosette(ctx, w / 2 + lw / 2 - 40, cy, 15);
  rosette(ctx, w / 2 - lw / 2 + 40, cy, 15);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, cy + 2);

  // The mark of the app.
  ctx.font = `400 30px "Reem Kufi", "Amiri", sans-serif`;
  ctx.fillStyle = c.soft;
  ctx.fillText("أثر", w / 2, h - (format === "story" ? 140 : 56));
  return canvas;
}

export async function renderMishkatPoster(content: MishkatContent, palette: MishkatPalette, format: MishkatFormat): Promise<Blob> {
  await ensurePosterFonts();
  const canvas = drawMishkatPoster(content, palette, format);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("poster"))), "image/png"));
}
