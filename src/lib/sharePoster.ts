import { formatLeadingIstiadhahBasmalah } from "@/lib/arabic";

type PosterTheme = {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  themeName: string;
};

/* ─── Font & theme plumbing ─────────────────────────────────────────────── */

async function preloadFonts() {
  const weights = ["400", "500", "700", "800"];
  const families = ['"Noto Naskh Arabic"', '"Amiri"'];
  const loads: Promise<FontFace[]>[] = [];
  for (const fam of families) {
    for (const w of weights) {
      loads.push(document.fonts.load(`${w} 48px ${fam}`));
    }
  }
  await Promise.allSettled(loads);
}

function readCssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getThemeFromCss(): PosterTheme {
  const bg = readCssVar("--bg") || "#07080b";
  const fg = readCssVar("--fg") || "#f5f7ff";
  const accent = readCssVar("--accent") || "#ffd780";
  const accent2 = readCssVar("--accent-2") || accent;
  const themeName = document.documentElement.className || "system";
  return { bg, fg, accent, accent2, themeName };
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseRgb(color: string): { r: number; g: number; b: number } | null {
  const c = color.trim();
  const rgb = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };

  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const v = hex[1];
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16),
    };
  }
  return null;
}

function rgba(base: string, a: number) {
  const rgb = parseRgb(base);
  if (!rgb) return `rgba(255,255,255,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ─── Arabic-aware text wrap (respects RTL joining) ─────────────────────── */

function wrapRtlText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    const width = ctx.measureText(next).width;
    if (width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fontSizeByLength(len: number) {
  if (len > 900) return 38;
  if (len > 520) return 46;
  if (len > 260) return 54;
  if (len > 120) return 62;
  return 70;
}

/* ─── Decorative ornaments (programmatic arabesque) ────────────────────── */

/**
 * Draw an 8-point star (the khatim / "seal" used in Islamic ornament).
 */
function draw8Star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const ang = (i * Math.PI) / 8 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.44;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Draw a 6-petal rosette used inside medallions.
 */
function drawRosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI) / 6 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.55;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Programmatic arabesque corner flourish — interlacing arcs radiating
 * from the corner. Used at each corner of the ornate frame.
 */
function drawCornerFlourish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: "tl" | "tr" | "br" | "bl",
  size: number,
  stroke: string,
  fill: string,
) {
  ctx.save();
  ctx.translate(x, y);
  // orientation: 0 = top-left corner pointing down-right
  const rot = { tl: 0, tr: -Math.PI / 2, br: -Math.PI, bl: (-3 * Math.PI) / 2 }[side];
  ctx.rotate(rot);

  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = Math.max(2, size * 0.045);

  // outer curved arc - like a quarter of a circle ornament
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI / 2);
  ctx.stroke();

  // inner secondary arc
  ctx.beginPath();
  ctx.arc(size * 0.18, size * 0.18, size * 0.82, 0, Math.PI / 2);
  ctx.stroke();

  // 8-point star at the inner pivot
  draw8Star(ctx, size * 0.32, size * 0.32, size * 0.22);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, size * 0.025);
  ctx.stroke();

  // 3 little dots radiating from the inner pivot to outer arc
  for (let i = 0; i < 3; i++) {
    const t = 0.25 + i * 0.25;
    const px = size * t;
    ctx.beginPath();
    ctx.arc(px, px, Math.max(2, size * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Ornate diamond cluster — used as divider flourish on either side of
 * the title pill.
 */
function drawDiamondDivider(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  stroke: string,
  fill: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  // center large diamond
  draw8Star(ctx, 0, 0, size * 0.45);
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, size * 0.04);
  ctx.stroke();

  // two side diamonds
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    const x = dir * size * 1.1;
    ctx.moveTo(x, -size * 0.32);
    ctx.lineTo(x + size * 0.28, 0);
    ctx.lineTo(x, size * 0.32);
    ctx.lineTo(x - size * 0.28, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // connecting lines between
  ctx.lineWidth = Math.max(1, size * 0.025);
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, 0);
  ctx.lineTo(-size * 0.32, 0);
  ctx.moveTo(size * 0.32, 0);
  ctx.lineTo(size * 0.6, 0);
  ctx.stroke();
  ctx.restore();
}

/* ─── Starfield + atmosphere ────────────────────────────────────────────── */

function drawStarfield(ctx: CanvasRenderingContext2D, rng: () => number, w: number, h: number, accent: string, fg: string) {
  ctx.save();
  for (let i = 0; i < 220; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const size = rng() * 1.7 + 0.4;
    const alpha = 0.18 + rng() * 0.55;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 7 === 0 ? accent : fg;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    // tiny cross-flare on rare bright stars
    if (rng() < 0.05) {
      const flare = size * 3.2;
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillRect(x - flare * 0.06, y - flare * 0.5, flare * 0.12, flare);
      ctx.fillRect(x - flare * 0.5, y - flare * 0.06, flare, flare * 0.12);
    }
  }
  ctx.restore();
}

function drawBokeh(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  w: number,
  h: number,
  accent: string,
  accent2: string,
) {
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const bx = rng() * w;
    const by = rng() * h;
    const br = 60 + rng() * 240;
    const color = i % 2 ? accent : accent2;
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    grad.addColorStop(0, rgba(color, 0.18));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Image loader (same as before) ─────────────────────────────────────── */

async function loadImage(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/* ─── Programmatic arabesque layer (faint background tessellation) ─────── */

function drawArabesqueLayer(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  w: number,
  h: number,
  accent: string,
  stroke: string,
) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  const step = 124;
  for (let y = step / 2; y < h + step; y += step) {
    for (let x = step / 2; x < w + step; x += step) {
      // 8-point star outline
      ctx.globalAlpha = 0.07 + rng() * 0.04;
      draw8Star(ctx, x, y, step * 0.42);
      ctx.stroke();
      // rosette inside
      ctx.globalAlpha = 0.05 + rng() * 0.03;
      drawRosette(ctx, x, y, step * 0.28);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ─── Main poster entry ─────────────────────────────────────────────────── */

export async function renderDhikrPosterBlob(opts: {
  text: string;
  sectionTitle?: string;
  count?: number;
  footerUrl?: string;
  translation?: string;
}) {
  await preloadFonts();

  const theme = getThemeFromCss();
  const W = 1080;
  const H = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  const rng = mulberry32(seedFromString(`${theme.themeName}|${opts.text.slice(0, 40)}`));

  /* ────── 1. DEEP BACKGROUND ─────── */
  // dark base gradient (corner-cool → corner-warm)
  const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
  bg.addColorStop(0, "#0a0d14");
  bg.addColorStop(0.5, "rgba(0,0,0,0.96)");
  bg.addColorStop(1, "rgba(20,15,8,0.98)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // four-corner atmospheric glows
  ctx.save();
  const corners = [
    [W * 0.1, H * 0.08, theme.accent, 0.32, W * 0.7],
    [W * 0.95, H * 0.2, theme.accent2, 0.22, W * 0.65],
    [W * 0.05, H * 0.95, theme.accent2, 0.20, W * 0.6],
    [W * 0.9, H * 0.95, theme.accent, 0.28, W * 0.7],
  ] as const;
  for (const [cx, cy, c, alpha, r] of corners) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(c, alpha));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // faint arabesque layer (background tessellation)
  drawArabesqueLayer(ctx, rng, W, H, theme.accent, rgba(theme.accent, 1));

  // bokeh
  drawBokeh(ctx, rng, W, H, theme.accent, theme.accent2);

  // starfield
  drawStarfield(ctx, rng, W, H, theme.accent, theme.fg);

  // diagonal parchment-like wash from upper-left
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.7, 0);
  ctx.lineTo(0, H * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // bottom vignette — darkens footer
  ctx.save();
  const vg = ctx.createLinearGradient(0, H - 240, 0, H);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, H - 240, W, 240);
  ctx.restore();

  /* ────── 2. ORNATE OUTER FRAME ─────── */
  // the frame is built up in layers, from outside in
  const framePad = 64;
  const fx = framePad;
  const fy = framePad;
  const fw = W - framePad * 2;
  const fh = H - framePad * 2;

  // outermost dust-glow ring
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 60);
  ctx.shadowColor = rgba(theme.accent, 1);
  ctx.shadowBlur = 60;
  ctx.strokeStyle = rgba(theme.accent, 0.14);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // gold/parchment frame (gradient stroke)
  ctx.save();
  const frameGrad = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
  frameGrad.addColorStop(0, rgba(theme.accent, 1));
  frameGrad.addColorStop(0.5, rgba(theme.accent2, 1));
  frameGrad.addColorStop(1, rgba(theme.accent, 1));
  roundRect(ctx, fx, fy, fw, fh, 60);
  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // inner thin frame, just inside the gold one
  ctx.save();
  roundRect(ctx, fx + 24, fy + 24, fw - 48, fh - 48, 48);
  const innerGrad = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
  innerGrad.addColorStop(0, rgba(theme.accent, 0.7));
  innerGrad.addColorStop(0.5, rgba(theme.accent2, 0.4));
  innerGrad.addColorStop(1, rgba(theme.accent, 0.7));
  ctx.strokeStyle = innerGrad;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // corner flourishes
  const cornerSize = 96;
  const cornersArray = ["tl", "tr", "br", "bl"] as const;
  for (const side of cornersArray) {
    const cx = { tl: fx + 8, tr: fx + fw - 8, br: fx + fw - 8, bl: fx + 8 }[side];
    const cy = { tl: fy + 8, tr: fy + 8, br: fy + fh - 8, bl: fy + fh - 8 }[side];
    drawCornerFlourish(ctx, cx, cy, side, cornerSize, rgba(theme.accent, 0.95), rgba(theme.accent, 0.18));
  }

  // top + bottom center crescent flourishes
  const topCx = W / 2;
  const topCy = fy + 18;
  drawDiamondDivider(ctx, topCx, topCy, 18, rgba(theme.accent, 0.85), rgba(theme.accent, 0.30));
  const botCy = fy + fh - 18;
  drawDiamondDivider(ctx, topCx, botCy, 18, rgba(theme.accent, 0.85), rgba(theme.accent, 0.30));

  /* ────── 3. APP NAME PLATE (centered top) ─────── */
  const plateY = fy + 78;
  ctx.save();
  // soft elliptical halo behind the title
  const haloGrad = ctx.createRadialGradient(W / 2, plateY + 32, 0, W / 2, plateY + 32, 360);
  haloGrad.addColorStop(0, rgba(theme.accent, 0.32));
  haloGrad.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = haloGrad;
  ctx.fillRect(W / 2 - 360, plateY - 60, 720, 220);
  ctx.restore();

  // decorative side ribbons flanking the title
  ctx.save();
  ctx.strokeStyle = rgba(theme.accent, 0.65);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 360, plateY + 32);
  ctx.lineTo(W / 2 - 200, plateY + 32);
  ctx.moveTo(W / 2 + 200, plateY + 32);
  ctx.lineTo(W / 2 + 360, plateY + 32);
  ctx.stroke();
  // small diamonds on each ribbon
  for (let i = 0; i < 4; i++) {
    const px = W / 2 - 280 + i * 30;
    drawDiamondDivider(ctx, px, plateY + 32, 6, rgba(theme.accent, 0.85), rgba(theme.accent, 0.5));
    drawDiamondDivider(ctx, W - px, plateY + 32, 6, rgba(theme.accent, 0.85), rgba(theme.accent, 0.5));
  }
  ctx.restore();

  // app name "أثر" with glow
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 68px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  // soft outer halo
  ctx.shadowColor = rgba(theme.accent, 1);
  ctx.shadowBlur = 22;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.fillText("أثر", W / 2, plateY + 30);
  ctx.shadowBlur = 0;
  // sharp inner highlight
  const appGrad = ctx.createLinearGradient(0, plateY, 0, plateY + 80);
  appGrad.addColorStop(0, rgba(theme.accent, 1));
  appGrad.addColorStop(1, rgba(theme.accent2, 0.9));
  ctx.fillStyle = appGrad;
  ctx.fillText("أثر", W / 2, plateY + 30);
  // bilingual subtitle right below
  ctx.font = `400 16px 'Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillStyle = rgba(theme.fg, 0.7);
  ctx.fillText("ATHAR", W / 2, plateY + 86);
  ctx.restore();

  // ornamental separator under the app name
  const sep1Y = plateY + 130;
  ctx.save();
  drawDiamondDivider(ctx, W / 2, sep1Y, 22, rgba(theme.accent, 0.9), rgba(theme.accent, 0.4));
  ctx.restore();

  /* ────── 4. SECTION TITLE MEDALLION ─────── */
  const sectionTitle = (opts.sectionTitle ?? "ذكر").trim();
  const titleMeasure = (() => {
    const c = canvas.getContext("2d")!;
    c.font = `700 36px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
    return c.measureText(sectionTitle);
  })();

  const medW = Math.min(titleMeasure.width + 200, fw - 220);
  const medH = 96;
  const medX = (W - medW) / 2;
  const medY = sep1Y + 76;

  // halo behind the medallion
  ctx.save();
  const medHalo = ctx.createRadialGradient(W / 2, medY + medH / 2, 0, W / 2, medY + medH / 2, medW * 0.7);
  medHalo.addColorStop(0, rgba(theme.accent, 0.32));
  medHalo.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = medHalo;
  ctx.fillRect(W / 2 - medW * 0.7, medY - 60, medW * 1.4, medH + 120);
  ctx.restore();

  // medallion pill with gold gradient
  ctx.save();
  roundRect(ctx, medX, medY, medW, medH, medH / 2);
  const medGrad = ctx.createLinearGradient(medX, medY, medX + medW, medY);
  medGrad.addColorStop(0, rgba(theme.accent, 0.30));
  medGrad.addColorStop(0.5, rgba(theme.accent, 0.45));
  medGrad.addColorStop(1, rgba(theme.accent, 0.30));
  ctx.fillStyle = medGrad;
  ctx.fill();
  // double border
  ctx.strokeStyle = rgba(theme.accent, 0.75);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  roundRect(ctx, medX + 6, medY + 6, medW - 12, medH - 12, medH / 2 - 6);
  ctx.strokeStyle = rgba(theme.accent, 0.40);
  ctx.lineWidth = 1;
  ctx.stroke();
  // 6-point rosettes on the two ends
  const rosetteR = medH * 0.42;
  drawRosette(ctx, medX + 24, medY + medH / 2, rosetteR);
  ctx.fillStyle = rgba(theme.accent, 0.85);
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.95);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawRosette(ctx, medX + medW - 24, medY + medH / 2, rosetteR);
  ctx.fill();
  ctx.stroke();

  // title text
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 36px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.shadowColor = rgba(theme.accent, 0.65);
  ctx.shadowBlur = 14;
  ctx.fillText(sectionTitle, medX + medW / 2, medY + medH / 2 + 2);
  ctx.shadowBlur = 0;
  ctx.restore();

  /* ────── 5. ORNAMENTAL DIVIDER 2 ─────── */
  const sep2Y = medY + medH + 64;
  ctx.save();
  // long fading line + center star ornament
  const lg = ctx.createLinearGradient(fx + 80, 0, fx + fw - 80, 0);
  lg.addColorStop(0, rgba(theme.fg, 0));
  lg.addColorStop(0.2, rgba(theme.fg, 0.18));
  lg.addColorStop(0.8, rgba(theme.fg, 0.18));
  lg.addColorStop(1, rgba(theme.fg, 0));
  ctx.strokeStyle = lg;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx + 80, sep2Y);
  ctx.lineTo(fx + fw - 80, sep2Y);
  ctx.stroke();
  // center 8-point star with halo
  const starHalo = ctx.createRadialGradient(W / 2, sep2Y, 0, W / 2, sep2Y, 64);
  starHalo.addColorStop(0, rgba(theme.accent, 0.35));
  starHalo.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = starHalo;
  ctx.fillRect(W / 2 - 64, sep2Y - 64, 128, 128);
  draw8Star(ctx, W / 2, sep2Y, 30);
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.95);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 4 tiny stars around it
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 - Math.PI / 4;
    const dx = W / 2 + Math.cos(ang) * 96;
    const dy = sep2Y + Math.sin(ang) * 96;
    draw8Star(ctx, dx, dy, 8);
    ctx.fillStyle = rgba(theme.accent, 0.7);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  /* ────── 6. DHIKR TEXT ─────── */
  const text = formatLeadingIstiadhahBasmalah((opts.text ?? "").trim());
  const fontSize = fontSizeByLength(text.length);
  const lineHeight = Math.round(fontSize * 1.7);
  const arabicFont = `700 ${fontSize}px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;

  const textAreaTop = sep2Y + 84;
  const textAreaBottom = fy + fh - 280; // leave room for the seal + footer
  const maxWidth = fw - 96;
  const centerX = W / 2;

  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.fg;
  ctx.font = arabicFont;

  const paragraphs = text.split("\n");
  const allLines: string[] = [];
  for (const p of paragraphs) {
    const wrapped = wrapRtlText(ctx, p, maxWidth);
    if (allLines.length) allLines.push("");
    allLines.push(...wrapped);
  }

  // Optional translation block (LTR), drawn below the Arabic
  const translation = (opts.translation ?? "").trim();
  const transFontSize = 30;
  const transLineHeight = Math.round(transFontSize * 1.45);
  let transLines: string[] = [];
  if (translation) {
    ctx.save();
    ctx.direction = "ltr";
    ctx.font = `400 ${transFontSize}px 'Segoe UI',Tahoma,Arial,sans-serif`;
    transLines = wrapRtlText(ctx, translation, maxWidth);
    ctx.restore();
  }
  const transBlockH = transLines.length
    ? transLines.length * transLineHeight + 36 /* gap above */
    : 0;

  // Vertically center the combined (Arabic + translation) block
  const totalTextH = allLines.length * lineHeight - (lineHeight - fontSize) + transBlockH;
  const availH = textAreaBottom - textAreaTop;
  let ty = textAreaTop + Math.max(0, (availH - totalTextH) / 2) + fontSize;

  for (const line of allLines) {
    if (ty > textAreaBottom) break;
    if (!line) { ty += Math.round(lineHeight * 0.55); continue; }
    // Soft + sharp dual-layer text shadow for carved/embossed feel
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;
    ctx.fillText(line, centerX, ty);
    ctx.shadowColor = rgba(theme.accent, 0.18);
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 0;
    ctx.fillText(line, centerX, ty);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ty += lineHeight;
  }
  ctx.restore();

  // Draw translation lines (LTR, dimmed) under the Arabic
  if (transLines.length) {
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `400 ${transFontSize}px 'Segoe UI',Tahoma,Arial,sans-serif`;
    ctx.fillStyle = rgba(theme.fg, 0.78);
    let ty2 = ty + 36;
    for (const line of transLines) {
      if (ty2 > textAreaBottom) break;
      ctx.fillText(line, centerX, ty2);
      ty2 += transLineHeight;
    }
    ctx.restore();
  }

  /* ────── 7. ORNAMENTAL DIVIDER 3 ─────── */
  const sep3Y = fy + fh - 252;
  ctx.save();
  const sep3Grad = ctx.createLinearGradient(fx + 120, 0, fx + fw - 120, 0);
  sep3Grad.addColorStop(0, rgba(theme.fg, 0));
  sep3Grad.addColorStop(0.5, rgba(theme.fg, 0.35));
  sep3Grad.addColorStop(1, rgba(theme.fg, 0));
  ctx.strokeStyle = sep3Grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx + 120, sep3Y);
  ctx.lineTo(fx + fw - 120, sep3Y);
  ctx.stroke();
  drawDiamondDivider(ctx, W / 2, sep3Y, 14, rgba(theme.accent, 0.85), rgba(theme.accent, 0.4));
  ctx.restore();

  /* ────── 8. COUNT SEAL (wax-stamp style) ─────── */
  if (opts.count && opts.count > 1) {
    const sealCx = W / 2;
    const sealCy = sep3Y + 96;
    const sealR = 60;

    ctx.save();
    // outer halo
    const sealHalo = ctx.createRadialGradient(sealCx, sealCy, sealR * 0.4, sealCx, sealCy, sealR * 2);
    sealHalo.addColorStop(0, rgba(theme.accent, 0.32));
    sealHalo.addColorStop(1, rgba(theme.accent, 0));
    ctx.fillStyle = sealHalo;
    ctx.fillRect(sealCx - sealR * 2, sealCy - sealR * 2, sealR * 4, sealR * 4);

    // 8-point outer star ring
    draw8Star(ctx, sealCx, sealCy, sealR * 1.18);
    ctx.fillStyle = rgba(theme.accent, 0.18);
    ctx.fill();
    ctx.strokeStyle = rgba(theme.accent, 0.85);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // inner gold disc
    const sealGrad = ctx.createLinearGradient(sealCx - sealR, sealCy - sealR, sealCx + sealR, sealCy + sealR);
    sealGrad.addColorStop(0, rgba(theme.accent, 1));
    sealGrad.addColorStop(0.5, rgba(theme.accent2, 1));
    sealGrad.addColorStop(1, rgba(theme.accent, 1));
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = sealGrad;
    ctx.fill();

    // soft engraving shadow on the disc
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // count text on the seal
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 38px 'Segoe UI','Tahoma',Arial,sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillText(`${opts.count}`, sealCx, sealCy + 4);
    // "تكرار" label above the number
    ctx.font = `700 12px 'Noto Naskh Arabic','Amiri',Tahoma,Arial,sans-serif`;
    ctx.fillText("تكرار", sealCx, sealCy - 24);
    ctx.restore();
  }

  /* ────── 9. FOOTER RIBBON ─────── */
  const footerY = fy + fh - 122;
  const footerH = 88;
  const footerUrl = (opts.footerUrl ?? "www.athark.org").trim();
  const footerX = fx + 64;
  const footerW = fw - 128;

  ctx.save();
  // ribbon body
  roundRect(ctx, footerX, footerY, footerW, footerH, footerH / 2);
  const ribbonGrad = ctx.createLinearGradient(footerX, footerY, footerX + footerW, footerY);
  ribbonGrad.addColorStop(0, "rgba(0,0,0,0.55)");
  ribbonGrad.addColorStop(1, rgba(theme.accent, 0.20));
  ctx.fillStyle = ribbonGrad;
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.65);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ribbon end notches (V-cut on both ends)
  ctx.beginPath();
  ctx.moveTo(footerX + 18, footerY);
  ctx.lineTo(footerX, footerY + footerH / 2);
  ctx.lineTo(footerX + 18, footerY + footerH);
  ctx.lineTo(footerX + 36, footerY + footerH);
  ctx.lineTo(footerX + 54, footerY + footerH / 2);
  ctx.lineTo(footerX + 36, footerY);
  ctx.closePath();
  ctx.fillStyle = ribbonGrad;
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.65);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(footerX + footerW - 18, footerY);
  ctx.lineTo(footerX + footerW, footerY + footerH / 2);
  ctx.lineTo(footerX + footerW - 18, footerY + footerH);
  ctx.lineTo(footerX + footerW - 36, footerY + footerH);
  ctx.lineTo(footerX + footerW - 54, footerY + footerH / 2);
  ctx.lineTo(footerX + footerW - 36, footerY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // brand centered
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 26px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillStyle = rgba(theme.accent, 0.95);
  ctx.shadowColor = rgba(theme.accent, 0.55);
  ctx.shadowBlur = 10;
  ctx.fillText("أثر  •  ATHAR", W / 2, footerY + footerH / 2 - 2);
  ctx.shadowBlur = 0;
  // tiny URL under brand
  ctx.font = `400 14px 'Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillStyle = rgba(theme.fg, 0.55);
  ctx.fillText(footerUrl, W / 2, footerY + footerH - 16);

  // left/right decorative dots flanking the brand
  for (const sign of [-1, 1]) {
    const dx = W / 2 + sign * 140;
    ctx.fillStyle = rgba(theme.accent, 0.55);
    ctx.beginPath();
    ctx.arc(dx, footerY + footerH / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /* ────── 10. OPTIONAL PHOTO OVERLAY (themeless) ─────── */
  // The user said the previous photo overlay was OK; we keep the candidates
  // lookup so photo themes still get the cover shot if available, but we
  // dial back its dominance so the programmatic ornate layer is the hero.
  let bgImage: HTMLImageElement | null = null;
  const base = import.meta.env.BASE_URL;
  const t = (theme.themeName || "").split(/\s+/).filter(Boolean)[0] || "system";
  const candidates = [
    `${base}posters/${t}/01.jpg`,
    `${base}posters/${t}/02.jpg`,
    `${base}posters/system/01.jpg`,
  ];
  for (const c of candidates) {
    try { bgImage = await loadImage(c); break; } catch { bgImage = null; }
  }
  if (bgImage) {
    // very faint overlay on top so the photographic texture hints through
    ctx.save();
    ctx.globalAlpha = 0.08;
    drawCover(ctx, bgImage, 0, 0, W, H);
    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
