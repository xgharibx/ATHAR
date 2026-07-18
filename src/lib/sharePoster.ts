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

/* ─── Arabic-aware text wrap ────────────────────────────────────────────── */

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

/* ─── Subtle ornaments: dots + crescents, no stars ──────────────────────── */

/**
 * A single tiny dot. The only background ornament allowed in the design.
 */
function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Crescent moon (هلال). Drawn as two overlapping circles — outer
 * filled, inner cut out — facing right. Used sparingly as the only
 * "shape" ornament in the design.
 */
function drawCrescent(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.arc(cx + r * 0.5, cy, r * 0.92, (3 * Math.PI) / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A small cluster of dots used as a divider centre — replaces the
 * previous "diamond + side diamonds" / "8-star + 4 satellites" motif.
 * Pattern:  · · · ☾ · · ·
 */
function drawDotDivider(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  fill: string,
) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.7;
  // flanking tiny dots
  for (const dx of [-38, 14, -14, 38]) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // centre crescent
  drawCrescent(ctx, cx, cy, 9, fill);
}

/**
 * A subtle corner curve — replaces the 4-arc-with-star flourish.
 * Just a single curved accent line + 3 small dots. No stars.
 */
function drawCornerCurve(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: "tl" | "tr" | "br" | "bl",
  size: number,
  stroke: string,
) {
  ctx.save();
  ctx.translate(x, y);
  const rot = { tl: 0, tr: -Math.PI / 2, br: -Math.PI, bl: (-3 * Math.PI) / 2 }[side];
  ctx.rotate(rot);

  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI / 2);
  ctx.stroke();

  // 3 small radial dots — no star at the pivot
  ctx.fillStyle = stroke;
  for (let i = 0; i < 3; i++) {
    const t = 0.32 + i * 0.22;
    const px = size * t;
    ctx.beginPath();
    ctx.arc(px, px, Math.max(2, size * 0.04), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Tiny dot starfield (Athar-style: subtle far-background dots only) ── */

function drawDotField(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  w: number,
  h: number,
  accent: string,
  fg: string,
) {
  ctx.save();
  for (let i = 0; i < 280; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const size = rng() * 1.1 + 0.3;
    const alpha = 0.10 + rng() * 0.35;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 9 === 0 ? accent : fg;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSoftBokeh(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  w: number,
  h: number,
  accent: string,
  accent2: string,
) {
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const bx = rng() * w;
    const by = rng() * h;
    const br = 80 + rng() * 220;
    const color = i % 2 ? accent : accent2;
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    grad.addColorStop(0, rgba(color, 0.14));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Image loader ──────────────────────────────────────────────────────── */

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
  const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
  bg.addColorStop(0, "#0a0d14");
  bg.addColorStop(0.5, "rgba(0,0,0,0.96)");
  bg.addColorStop(1, "rgba(20,15,8,0.98)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // four-corner atmospheric glows (soft, not stars)
  ctx.save();
  const corners: ReadonlyArray<readonly [number, number, string, number, number]> = [
    [W * 0.1, H * 0.08, theme.accent, 0.30, W * 0.7],
    [W * 0.95, H * 0.2, theme.accent2, 0.20, W * 0.65],
    [W * 0.05, H * 0.95, theme.accent2, 0.18, W * 0.6],
    [W * 0.9, H * 0.95, theme.accent, 0.26, W * 0.7],
  ];
  for (const [cx, cy, c, alpha, r] of corners) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(c, alpha));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // subtle bokeh (no big orbs)
  drawSoftBokeh(ctx, rng, W, H, theme.accent, theme.accent2);

  // tiny dot starfield (Athar-style far-background dots — only thing allowed)
  drawDotField(ctx, rng, W, H, theme.accent, theme.fg);

  // diagonal parchment wash
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.7, 0);
  ctx.lineTo(0, H * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // bottom vignette
  ctx.save();
  const vg = ctx.createLinearGradient(0, H - 240, 0, H);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, H - 240, W, 240);
  ctx.restore();

  /* ────── 2. ORNATE FRAME (no corner flourishes) ─────── */
  const framePad = 64;
  const fx = framePad;
  const fy = framePad;
  const fw = W - framePad * 2;
  const fh = H - framePad * 2;

  // outer dust-glow ring
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 60);
  ctx.shadowColor = rgba(theme.accent, 1);
  ctx.shadowBlur = 60;
  ctx.strokeStyle = rgba(theme.accent, 0.14);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // gold/parchment frame
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

  // inner thin frame
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

  // VERY subtle corner curves (just a quarter-arc + dots — no flourish, no star)
  const cornerSize = 88;
  for (const side of ["tl", "tr", "br", "bl"] as const) {
    const cx = { tl: fx + 12, tr: fx + fw - 12, br: fx + fw - 12, bl: fx + 12 }[side];
    const cy = { tl: fy + 12, tr: fy + 12, br: fy + fh - 12, bl: fy + fh - 12 }[side];
    drawCornerCurve(ctx, cx, cy, side, cornerSize, rgba(theme.accent, 0.85));
  }

  // top + bottom center crescents (replaces the 8-star diamond dividers)
  drawCrescent(ctx, W / 2, fy + 18, 12, rgba(theme.accent, 0.85));
  drawCrescent(ctx, W / 2, fy + fh - 18, 12, rgba(theme.accent, 0.85));

  /* ────── 3. APP NAME PLATE (centered top) ─────── */
  const plateY = fy + 78;

  // soft elliptical halo behind the title
  ctx.save();
  const haloGrad = ctx.createRadialGradient(W / 2, plateY + 32, 0, W / 2, plateY + 32, 360);
  haloGrad.addColorStop(0, rgba(theme.accent, 0.32));
  haloGrad.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = haloGrad;
  ctx.fillRect(W / 2 - 360, plateY - 60, 720, 220);
  ctx.restore();

  // subtle side ribbons — replaced the diamond clusters with small dot rows
  ctx.save();
  ctx.strokeStyle = rgba(theme.accent, 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 360, plateY + 32);
  ctx.lineTo(W / 2 - 200, plateY + 32);
  ctx.moveTo(W / 2 + 200, plateY + 32);
  ctx.lineTo(W / 2 + 360, plateY + 32);
  ctx.stroke();
  ctx.restore();
  // tiny dots on each ribbon
  for (const xOff of [-280, -250, -220, 220, 250, 280]) {
    drawDot(ctx, W / 2 + xOff, plateY + 32, 1.8, rgba(theme.accent, 0.7));
  }

  // app name "أثر" with glow (no star ornament)
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 68px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.shadowColor = rgba(theme.accent, 1);
  ctx.shadowBlur = 22;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.fillText("أثر", W / 2, plateY + 30);
  ctx.shadowBlur = 0;
  const appGrad = ctx.createLinearGradient(0, plateY, 0, plateY + 80);
  appGrad.addColorStop(0, rgba(theme.accent, 1));
  appGrad.addColorStop(1, rgba(theme.accent2, 0.9));
  ctx.fillStyle = appGrad;
  ctx.fillText("أثر", W / 2, plateY + 30);
  // bilingual subtitle
  ctx.font = `400 16px 'Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillStyle = rgba(theme.fg, 0.7);
  ctx.fillText("ATHAR", W / 2, plateY + 86);
  ctx.restore();

  // ornamental separator under the app name — just dots + crescent
  const sep1Y = plateY + 130;
  ctx.save();
  drawDotDivider(ctx, W / 2, sep1Y, rgba(theme.accent, 0.85));
  ctx.restore();

  /* ────── 4. SECTION TITLE PILL — minimal, no rosettes ─────── */
  const sectionTitle = (opts.sectionTitle ?? "ذكر").trim();
  const titleMeasure = (() => {
    const c = canvas.getContext("2d")!;
    c.font = `700 36px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
    return c.measureText(sectionTitle);
  })();

  const medW = Math.min(titleMeasure.width + 140, fw - 220);
  const medH = 92;
  const medX = (W - medW) / 2;
  const medY = sep1Y + 76;

  // halo behind the medallion
  ctx.save();
  const medHalo = ctx.createRadialGradient(W / 2, medY + medH / 2, 0, W / 2, medY + medH / 2, medW * 0.7);
  medHalo.addColorStop(0, rgba(theme.accent, 0.30));
  medHalo.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = medHalo;
  ctx.fillRect(W / 2 - medW * 0.7, medY - 60, medW * 1.4, medH + 120);
  ctx.restore();

  // pill — simple double-bordered pill, no end ornaments
  ctx.save();
  roundRect(ctx, medX, medY, medW, medH, medH / 2);
  const medGrad = ctx.createLinearGradient(medX, medY, medX + medW, medY);
  medGrad.addColorStop(0, rgba(theme.accent, 0.28));
  medGrad.addColorStop(0.5, rgba(theme.accent, 0.42));
  medGrad.addColorStop(1, rgba(theme.accent, 0.28));
  ctx.fillStyle = medGrad;
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.7);
  // NOTE: tiny crescent + dots on either side of the title for life
  // (no 6-petal rosettes as before)
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, medX + 6, medY + 6, medW - 12, medH - 12, medH / 2 - 6);
  ctx.strokeStyle = rgba(theme.accent, 0.32);
  ctx.lineWidth = 1;
  ctx.stroke();

  // tiny dot accents at each end of the pill
  drawDot(ctx, medX + 26, medY + medH / 2, 2.2, rgba(theme.accent, 0.85));
  drawDot(ctx, medX + medW - 26, medY + medH / 2, 2.2, rgba(theme.accent, 0.85));

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 36px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.shadowColor = rgba(theme.accent, 0.55);
  ctx.shadowBlur = 12;
  ctx.fillText(sectionTitle, medX + medW / 2, medY + medH / 2 + 2);
  ctx.shadowBlur = 0;
  ctx.restore();

  /* ────── 5. DIVIDER 2 — fading line + small crescent only ─────── */
  const sep2Y = medY + medH + 64;
  ctx.save();
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
  // single crescent centered, with 4 small dots flanking
  drawCrescent(ctx, W / 2, sep2Y, 18, rgba(theme.accent, 0.85));
  for (const dx of [-46, -28, 28, 46]) {
    drawDot(ctx, W / 2 + dx, sep2Y, 1.8, rgba(theme.accent, 0.55));
  }
  ctx.restore();

  /* ────── 6. DHIKR TEXT ─────── */
  const text = formatLeadingIstiadhahBasmalah((opts.text ?? "").trim());
  const fontSize = fontSizeByLength(text.length);
  const lineHeight = Math.round(fontSize * 1.7);
  const arabicFont = `700 ${fontSize}px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;

  const textAreaTop = sep2Y + 84;
  const textAreaBottom = fy + fh - 280;
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
    ? transLines.length * transLineHeight + 36
    : 0;

  const totalTextH = allLines.length * lineHeight - (lineHeight - fontSize) + transBlockH;
  const availH = textAreaBottom - textAreaTop;
  let ty = textAreaTop + Math.max(0, (availH - totalTextH) / 2) + fontSize;

  for (const line of allLines) {
    if (ty > textAreaBottom) break;
    if (!line) { ty += Math.round(lineHeight * 0.55); continue; }
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    ctx.fillText(line, centerX, ty);
    ctx.shadowColor = rgba(theme.accent, 0.12);
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 0;
    ctx.fillText(line, centerX, ty);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ty += lineHeight;
  }
  ctx.restore();

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

  /* ────── 7. DIVIDER 3 ─────── */
  const sep3Y = fy + fh - 252;
  ctx.save();
  const sep3Grad = ctx.createLinearGradient(fx + 120, 0, fx + fw - 120, 0);
  sep3Grad.addColorStop(0, rgba(theme.fg, 0));
  sep3Grad.addColorStop(0.5, rgba(theme.fg, 0.30));
  sep3Grad.addColorStop(1, rgba(theme.fg, 0));
  ctx.strokeStyle = sep3Grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx + 120, sep3Y);
  ctx.lineTo(fx + fw - 120, sep3Y);
  ctx.stroke();
  drawDotDivider(ctx, W / 2, sep3Y, rgba(theme.accent, 0.85));
  ctx.restore();

  /* ────── 8. COUNT SEAL — simple circle + crescent, no star ring ─────── */
  if (opts.count && opts.count > 1) {
    const sealCx = W / 2;
    const sealCy = sep3Y + 96;
    const sealR = 58;

    ctx.save();
    // outer halo
    const sealHalo = ctx.createRadialGradient(sealCx, sealCy, sealR * 0.4, sealCx, sealCy, sealR * 2);
    sealHalo.addColorStop(0, rgba(theme.accent, 0.28));
    sealHalo.addColorStop(1, rgba(theme.accent, 0));
    ctx.fillStyle = sealHalo;
    ctx.fillRect(sealCx - sealR * 2, sealCy - sealR * 2, sealR * 4, sealR * 4);

    // plain outer ring (no star rays)
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(theme.accent, 0.6);
    ctx.lineWidth = 1.8;
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

    // engraving shadow on the disc
    ctx.beginPath();
    ctx.arc(sealCx, sealCy, sealR * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // tiny crescent on the seal — replaces the star ring
    drawCrescent(ctx, sealCx, sealCy - sealR * 0.55, 10, "rgba(0,0,0,0.7)");

    // count text
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 34px 'Segoe UI','Tahoma',Arial,sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillText(`${opts.count}`, sealCx, sealCy + 8);
    ctx.restore();
  }

  /* ────── 9. FOOTER RIBBON ─────── */
  const footerY = fy + fh - 122;
  const footerH = 88;
  const footerUrl = (opts.footerUrl ?? "www.athark.org").trim();
  const footerX = fx + 64;
  const footerW = fw - 128;

  ctx.save();
  roundRect(ctx, footerX, footerY, footerW, footerH, footerH / 2);
  const ribbonGrad = ctx.createLinearGradient(footerX, footerY, footerX + footerW, footerY);
  ribbonGrad.addColorStop(0, "rgba(0,0,0,0.55)");
  ribbonGrad.addColorStop(1, rgba(theme.accent, 0.20));
  ctx.fillStyle = ribbonGrad;
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.65);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ribbon end notches
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
  ctx.font = `400 14px 'Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillStyle = rgba(theme.fg, 0.55);
  ctx.fillText(footerUrl, W / 2, footerY + footerH - 16);

  // small flanking dots instead of decorative ornaments
  for (const sign of [-1, 1]) {
    const dx = W / 2 + sign * 140;
    drawDot(ctx, dx, footerY + footerH / 2 - 2, 3, rgba(theme.accent, 0.55));
  }
  ctx.restore();

  /* ────── 10. OPTIONAL FADED PHOTO OVERLAY ─────── */
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
    ctx.save();
    ctx.globalAlpha = 0.06;
    drawCover(ctx, bgImage, 0, 0, W, H);
    ctx.restore();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
