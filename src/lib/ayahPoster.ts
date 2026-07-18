/* ─────────────────────────────────────────────────────────────────────────
   Athar · Ayah Share Poster
   ─────────────────────────────────────────────────────────────────────────
   A highly-customizable canvas poster for sharing a Quran ayah / verse.
   Output is a 1080×1350 PNG (4:5 social-ready). The user picks a
   background, a font, a colour theme, and a reference style from the
   composer modal; the canvas pipeline renders accordingly.

   Design vocabulary:
   • Backgrounds  → celestial | geometric | mihrab | calligraphic |
                   minimal | nebula
   • Fonts        → amiri (serif) | kfgq (quran-style) | arefRuqaa (naskh)
   • ColourThemes → gold (default warm) | silver (cool minimalist) |
                    emerald | sapphire | rose
   • ReferenceStyles → numbered | surahAyah | numberedSurahName

   The renderer exposes ONE function:
     renderAyahPosterBlob(config): Promise<Blob>

   Each background variant is a separate function module-section that
   takes (ctx, geom, theme) and draws the WHOLE background stack.
   Foreground (verse + reference + brand) is shared.
   ────────────────────────────────────────────────────────────────────── */

/* ─── Public types ─────────────────────────────────────────────────────── */

export type AyahBackground =
  | "celestial"   // night sky + crescent + distant stars
  | "geometric"   // faint geometric tessellation + gold accents
  | "mihrab"      // arch shape with subtle inner glow
  | "calligraphic" // parchment / rough-edged paper with classical frame
  | "minimal"     // clean centered text on a calm gradient
  | "nebula";     // multi-color soft cosmic clouds

export type AyahFont = "amiri" | "kfgq" | "arefRuqaa";
export type ColorTheme = "gold" | "silver" | "emerald" | "sapphire" | "rose";
export type ReferenceStyle = "numbered" | "surahAyah" | "numberedSurahName";

export interface AyahPosterConfig {
  /** Arabic text of the verse. */
  text: string;
  /** Ayah number (for "numbered" reference styles). Optional. */
  ayahNumber?: number;
  /** Surah name for "surahAyah" style. */
  surahName?: string;
  /** Surah number (display separately from name). */
  surahNumber?: number;
  /** Optional Latin translation (one short paragraph, LTR). */
  translation?: string;
  /** Optional transliteration (Latin script reading of the verse). */
  transliteration?: string;
  /** Brand footer URL — defaults to "athark.org". */
  footerUrl?: string;

  background?: AyahBackground;
  font?: AyahFont;
  colorTheme?: ColorTheme;
  referenceStyle?: ReferenceStyle;
  /** Scale of the verse text — 1 = default, range [0.7 .. 1.4]. */
  textScale?: number;
  /** Show translation under the Arabic. */
  showTranslation?: boolean;
  /** Show transliteration between Arabic and translation. */
  showTransliteration?: boolean;
  /** Optional watermark/logo overlay. */
  showBrand?: boolean;
}

/* ─── Palette + font stacks (per theme) ───────────────────────────────── */

interface Palette {
  ink: string;        // primary text color
  inkMuted: string;   // secondary text color (60% alpha applied via rgba)
  accent: string;     // primary accent
  accent2: string;    // secondary accent
  bg: string;         // background base
}

const PALETTES: Record<ColorTheme, Palette> = {
  gold:     { ink: "#f4e7c4", inkMuted: "#e9d8a8", accent: "#d8a657", accent2: "#caa065", bg: "#08090c" },
  silver:   { ink: "#eaecf2", inkMuted: "#c8cbd6", accent: "#c8d0dc", accent2: "#a8b2c4", bg: "#0a0c12" },
  emerald:  { ink: "#dfeede", inkMuted: "#a8c5b6", accent: "#5fa37e", accent2: "#3d8b66", bg: "#06120c" },
  sapphire: { ink: "#dfe5f3", inkMuted: "#a4b1cd", accent: "#5a86c0", accent2: "#3f6aaa", bg: "#070c18" },
  rose:     { ink: "#fae2dd", inkMuted: "#d8a8a8", accent: "#d68c8a", accent2: "#b66f6c", bg: "#180a0a" },
};

const FONT_STACKS: Record<AyahFont, string> = {
  amiri:        `"Amiri","Noto Naskh Arabic","Segoe UI",Tahoma,Arial,sans-serif`,
  kfgq:         `"KFGQPC Uthmanic","Amiri","Noto Naskh Arabic","Segoe UI",Tahoma,Arial,sans-serif`,
  arefRuqaa:    `"Aref Ruqaa","Amiri","Noto Naskh Arabic","Segoe UI",Tahoma,Arial,sans-serif`,
};

/* ─── Helpers ──────────────────────────────────────────────────────────── */

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicIndic = (n?: number | null): string =>
  n == null ? "" : String(Math.max(0, Math.floor(n))).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);

function readCssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function rgba(color: string, a: number): string {
  const c = color.trim();
  let rgb: [number, number, number] | null = null;
  if (c.startsWith("#")) {
    const h = c.slice(1);
    if (h.length === 6) rgb = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  } else {
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  if (!rgb) return `rgba(255,255,255,${a})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
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

function drawCrescent(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string, dir: 1 | -1 = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.arc(cx + dir * r * 0.5, cy, r * 0.9, (3 * Math.PI) / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* Tiny dot starfield used in celestial + minimal backgrounds */
function drawStarfield(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  w: number, h: number,
  fg: string,
  accent: string,
  density: number = 200,
) {
  ctx.save();
  for (let i = 0; i < density; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = rng() * 1.1 + 0.4;
    ctx.fillStyle = rgba(i % 11 === 0 ? accent : fg, 0.10 + rng() * 0.30);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Font preloader ──────────────────────────────────────────────────── */
/** Wait for every font weight + size we'll render. Critical: large hero
 * numbers fall back to system serif if the exact (weight, size) hasn't
 * been loaded yet — same root cause that hit the dhikr poster. */
async function ensureFontsReady(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    const weights = ["400", "500", "600", "700", "800"];
    const sizes = ["18px", "24px", "32px", "48px", "78px", "96px", "110px"];
    const tasks: Promise<FontFace[]>[] = [];
    for (const stack of Object.values(FONT_STACKS)) {
      for (const w of weights) {
        for (const s of sizes) {
          tasks.push(document.fonts.load(`${w} ${s} ${stack}`));
        }
      }
    }
    await Promise.allSettled(tasks);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  } catch {/* ignored */}
}

/* ─── Geometry helpers ─────────────────────────────────────────────────── */
const POSTER_W = 1080;
const POSTER_H = 1350;

interface Geom {
  W: number; H: number;
  PAD: number;
  frameX: number; frameY: number; frameW: number; frameH: number;
  centerX: number; centerY: number;
}

function getGeom(): Geom {
  const PAD = 64;
  return {
    W: POSTER_W,
    H: POSTER_H,
    PAD,
    frameX: PAD,
    frameY: PAD,
    frameW: POSTER_W - PAD * 2,
    frameH: POSTER_H - PAD * 2,
    centerX: POSTER_W / 2,
    centerY: POSTER_H / 2,
  };
}

/* ─── Background renderers (one per variant) ─────────────────────────── */
/** Each background fills the full 1080×1350 canvas, no frame — the
 *  foreground frame is drawn separately afterwards so the user can
 *  change the background without re-rendering the frame. */

function bgCelestial(ctx: CanvasRenderingContext2D, g: Geom, p: Palette, rng: () => number) {
  const { W, H } = g;
  // Deep base gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, p.bg);
  grad.addColorStop(0.6, rgba(p.bg, 0.95));
  grad.addColorStop(1, rgba(p.accent, 0.05));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Four-corner glows
  for (const [cx, cy, c, alpha, r] of [
    [W * 0.18, H * 0.12, p.accent,  0.22, W * 0.55],
    [W * 0.95, H * 0.20, p.accent2, 0.15, W * 0.55],
    [W * 0.05, H * 0.85, p.accent2, 0.13, W * 0.55],
    [W * 0.92, H * 0.90, p.accent,  0.18, W * 0.55],
  ] as const) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(c, alpha));
    grad.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  // 8-point rosette in upper-mid (very subtle)
  // (replaced with a single big crescent to keep ornament vocabulary tiny)
  ctx.save();
  const halo = ctx.createRadialGradient(W / 2, H * 0.18, 0, W / 2, H * 0.18, 280);
  halo.addColorStop(0, rgba(p.accent, 0.18));
  halo.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(W / 2 - 280, H * 0.18 - 280, 560, 560);
  // big top crescent
  drawCrescent(ctx, W / 2, H * 0.18, 80, rgba(p.accent, 0.55), 1);
  // accents flanking it
  for (const dx of [-200, 200]) {
    drawCrescent(ctx, W / 2 + dx, H * 0.18, 14, rgba(p.accent, 0.75), dx > 0 ? -1 : 1);
  }
  ctx.restore();
  // dot starfield (only thing allowed in the ornament vocabulary)
  drawStarfield(ctx, rng, W, H, p.ink, p.accent, 220);
}

function bgGeometric(ctx: CanvasRenderingContext2D, g: Geom, p: Palette, rng: () => number) {
  const { W, H } = g;
  // deep base
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  // Subtle radial light well centered
  const grad = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.7);
  grad.addColorStop(0, rgba(p.accent, 0.10));
  grad.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Geometric tessellation: stars + rosettes alternating on a grid
  ctx.save();
  ctx.strokeStyle = rgba(p.accent, 0.10);
  ctx.lineWidth = 1;
  const step = 130;
  for (let y = step / 2; y < H + step; y += step) {
    for (let x = step / 2; x < W + step; x += step) {
      // 8-point star outline
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const ang = (i * Math.PI) / 8 - Math.PI / 2;
        const rad = i % 2 === 0 ? step * 0.42 : step * 0.20;
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // 4 corner accent crescents (the only ornament)
  const corners: ReadonlyArray<readonly [number, number, 1 | -1, 1 | -1]> = [
    [80, 80, 1, 1],
    [W - 80, 80, -1, 1],
    [W - 80, H - 80, -1, -1],
    [80, H - 80, 1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    drawCrescent(ctx, cx, cy, 14, rgba(p.accent, 0.65), sx > 0 ? 1 : -1);
  }
}

function bgMihrab(ctx: CanvasRenderingContext2D, g: Geom, p: Palette, rng: () => number) {
  const { W, H } = g;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  const centerX = W / 2;
  const topY = 80;
  const bottomY = H - 80;
  const halfW = W * 0.42;
  const archTopY = topY + halfW * 0.55;
  // Outer arch frame
  ctx.save();
  ctx.strokeStyle = rgba(p.accent, 0.55);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - halfW, bottomY);
  ctx.lineTo(centerX - halfW, archTopY);
  ctx.arc(centerX, archTopY, halfW, Math.PI, 0);
  ctx.lineTo(centerX + halfW, bottomY);
  ctx.closePath();
  ctx.stroke();
  // Inner arch frame (thinner)
  ctx.strokeStyle = rgba(p.accent, 0.30);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(centerX - halfW + 22, bottomY);
  ctx.lineTo(centerX - halfW + 22, archTopY + 22);
  ctx.arc(centerX, archTopY + 22, halfW - 22, Math.PI, 0);
  ctx.lineTo(centerX + halfW - 22, bottomY);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  // Inner glow (subtle field inside the arch)
  ctx.save();
  const innerGrad = ctx.createRadialGradient(centerX, archTopY + (bottomY - archTopY) * 0.55, 0, centerX, archTopY + (bottomY - archTopY) * 0.55, halfW * 0.95);
  innerGrad.addColorStop(0, rgba(p.accent, 0.16));
  innerGrad.addColorStop(1, rgba(p.accent, 0));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX - halfW + 22, bottomY);
  ctx.lineTo(centerX - halfW + 22, archTopY + 22);
  ctx.arc(centerX, archTopY + 22, halfW - 22, Math.PI, 0);
  ctx.lineTo(centerX + halfW - 22, bottomY);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = innerGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.restore();
}

function bgCalligraphic(ctx: CanvasRenderingContext2D, g: Geom, p: Palette, rng: () => number) {
  const { W, H } = g;
  // Warm parchment base — using accent2 for paper tint
  ctx.fillStyle = rgba(p.accent2, 0.10);
  ctx.fillRect(0, 0, W, H);
  // Diagonal parchment wash (subtle)
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, rgba(p.accent, 0.22));
  grad.addColorStop(1, rgba(p.accent2, 0.05));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Vignette
  ctx.save();
  const vg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.65);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, rgba(p.bg, 0.65));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Diagonal serif arabesque ribbon at top
  ctx.save();
  ctx.strokeStyle = rgba(p.accent, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(60, 220);
  ctx.bezierCurveTo(W * 0.30, 130, W * 0.70, 130, W - 60, 220);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.accent, 0.25);
  ctx.beginPath();
  ctx.moveTo(60, 244);
  ctx.bezierCurveTo(W * 0.30, 154, W * 0.70, 154, W - 60, 244);
  ctx.stroke();
  ctx.restore();
  // Diagonal symmetric ribbon at bottom
  ctx.save();
  ctx.strokeStyle = rgba(p.accent, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(60, H - 220);
  ctx.bezierCurveTo(W * 0.30, H - 130, W * 0.70, H - 130, W - 60, H - 220);
  ctx.stroke();
  ctx.strokeStyle = rgba(p.accent, 0.25);
  ctx.beginPath();
  ctx.moveTo(60, H - 244);
  ctx.bezierCurveTo(W * 0.30, H - 154, W * 0.70, H - 154, W - 60, H - 244);
  ctx.stroke();
  ctx.restore();
  // 4 corner crescents (the only ornament)
  const corners: ReadonlyArray<readonly [number, number, 1 | -1, 1 | -1]> = [
    [110, 110, 1, 1],
    [W - 110, 110, -1, 1],
    [W - 110, H - 110, -1, -1],
    [110, H - 110, 1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    drawCrescent(ctx, cx, cy, 12, rgba(p.accent, 0.65), sx > 0 ? 1 : -1);
  }
}

function bgMinimal(ctx: CanvasRenderingContext2D, g: Geom, p: Palette, rng: () => number) {
  const { W, H } = g;
  // Soft calm gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, p.bg);
  grad.addColorStop(1, rgba(p.accent, 0.08));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Single warm halo above text
  const halo = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.55);
  halo.addColorStop(0, rgba(p.accent, 0.12));
  halo.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
  // Tiny dot starfield (subtle)
  drawStarfield(ctx, rng, W, H, p.ink, p.accent, 80);
  // A single thin gold rule at the top + bottom for structure
  ctx.save();
  ctx.strokeStyle = rgba(p.accent, 0.35);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, 90);
  ctx.lineTo(W * 0.75, 90);
  ctx.moveTo(W * 0.25, H - 90);
  ctx.lineTo(W * 0.75, H - 90);
  ctx.stroke();
  // Single small crescents at the end of each rule
  drawCrescent(ctx, W * 0.75 + 30, 90, 7, rgba(p.accent, 0.70), -1);
  drawCrescent(ctx, W * 0.25 - 30, H - 90, 7, rgba(p.accent, 0.70), 1);
  ctx.restore();
}

function bgNebula(ctx: CanvasRenderingContext2D, g: Geom, p: Palette, rng: () => number) {
  const { W, H } = g;
  // Deep base
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  // Multiple coloured clouds (overlapping radial gradients)
  const clouds: ReadonlyArray<readonly [number, number, string, number, number]> = [
    [W * 0.20, H * 0.30, p.accent,  0.32, W * 0.55],
    [W * 0.85, H * 0.25, p.accent2, 0.22, W * 0.50],
    [W * 0.15, H * 0.75, p.accent2, 0.18, W * 0.50],
    [W * 0.95, H * 0.85, p.accent,  0.30, W * 0.50],
    [W * 0.50, H * 0.55, p.ink,     0.06, W * 0.45],
  ];
  ctx.save();
  for (const [cx, cy, c, alpha, r] of clouds) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, rgba(c as string, alpha));
    grad.addColorStop(1, rgba(c as string, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  // A few bokeh orbs
  for (let i = 0; i < 12; i++) {
    const bx = rng() * W;
    const by = rng() * H;
    const br = 60 + rng() * 150;
    const color = i % 2 ? p.accent : p.accent2;
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    grad.addColorStop(0, rgba(color, 0.18));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  // minimal dots
  drawStarfield(ctx, rng, W, H, p.ink, p.accent, 100);
  // 4 corner crescents only
  const corners: ReadonlyArray<readonly [number, number, 1 | -1, 1 | -1]> = [
    [90, 90, 1, 1],
    [W - 90, 90, -1, 1],
    [W - 90, H - 90, -1, -1],
    [90, H - 90, 1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    drawCrescent(ctx, cx, cy, 11, rgba(p.accent, 0.55), sx > 0 ? 1 : -1);
  }
}

const BACKGROUND_DRAWERS: Record<AyahBackground,
  (ctx: CanvasRenderingContext2D, g: Geom, p: Palette, rng: () => number) => void
> = {
  celestial: bgCelestial,
  geometric: bgGeometric,
  mihrab: bgMihrab,
  calligraphic: bgCalligraphic,
  minimal: bgMinimal,
  nebula: bgNebula,
};

/* ─── Frame: shared by every variant ──────────────────────────────────── */
/** Thin double gold rule + corner accents. No stars or rosettes. */
function drawFrame(ctx: CanvasRenderingContext2D, g: Geom, p: Palette) {
  const { frameX, frameY, frameW, frameH } = g;
  ctx.save();
  const outerGrad = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH);
  outerGrad.addColorStop(0, rgba(p.accent, 0.90));
  outerGrad.addColorStop(0.5, rgba(p.accent2, 0.70));
  outerGrad.addColorStop(1, rgba(p.accent, 0.90));
  roundRect(ctx, frameX, frameY, frameW, frameH, 36);
  ctx.strokeStyle = outerGrad;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Inner frame
  roundRect(ctx, frameX + 22, frameY + 22, frameW - 44, frameH - 44, 28);
  ctx.strokeStyle = rgba(p.accent, 0.40);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // 4 corner crescents (facing inward)
  const cornerR = 24;
  for (const [cx, cy, sx, sy] of [
    [frameX + 30, frameY + 30, 1, 1],
    [frameX + frameW - 30, frameY + 30, -1, 1],
    [frameX + frameW - 30, frameY + frameH - 30, -1, -1],
    [frameX + 30, frameY + frameH - 30, 1, -1],
  ] as const) {
    const [px, py, dx, dy] = [cx, cy, sx, sy];
    drawCrescent(ctx, px + dx * cornerR * 0.3, py + dy * cornerR * 0.3, 9, rgba(p.accent, 0.65), dx > 0 ? -1 : 1);
  }

  // Centre crescents on top/bottom of frame
  drawCrescent(ctx, g.centerX, frameY, 10, rgba(p.accent, 0.75));
  drawCrescent(ctx, g.centerX, frameY + frameH, 10, rgba(p.accent, 0.75), -1);
}

/* ─── Verse layout ────────────────────────────────────────────────────── */
/** Wraps the verse text into a block that fits the available area; picks
 *  the largest font size that still satisfies height + width constraints. */
function pickHeroSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
  maxHeight: number,
): { size: number; lineHeight: number; lines: string[]; blockH: number; blockW: number } {
  function wrap(size: number) {
    ctx.font = `700 ${size}px ${font}`;
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    const lh = Math.round(size * 1.62);
    const out: string[] = [];
    const paragraphs = text.split("\n");
    for (const p of paragraphs) {
      if (!p.trim()) { out.push(""); continue; }
      const words = p.split(/\s+/).filter(Boolean);
      let cur = "";
      for (const w of words) {
        const next = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(next).width <= maxWidth || !cur) cur = next;
        else { out.push(cur); cur = w; }
      }
      if (cur) out.push(cur);
    }
    const blockH = out.length * lh - lh * 0.3;
    let blockW = 0;
    for (const l of out) {
      const w = ctx.measureText(l || " ").width;
      if (w > blockW) blockW = w;
    }
    return { size, lh, lines: out, blockH, blockW, lineHeight: lh };
  }
  const MIN = 36, MAX = 92;
  let lo = MIN, hi = MAX, chosen = wrap(MIN);
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const m = wrap(mid);
    if (m.blockH <= maxHeight && m.blockW <= maxWidth) { chosen = m; lo = mid + 1; }
    else hi = mid - 1;
  }
  return chosen;
}

/* ─── Reference (citation) line ──────────────────────────────────────── */
function buildReferenceLine(cfg: AyahPosterConfig): string {
  const style: ReferenceStyle = cfg.referenceStyle ?? "surahAyah";
  const sName = cfg.surahName ?? "";
  const aNum = toArabicIndic(cfg.ayahNumber);
  const sNum = toArabicIndic(cfg.surahNumber);
  switch (style) {
    case "numbered":           return `${aNum}`;                                                 // ٢٥٥
    case "surahAyah":          return `${sName}  ·  ${sNum}:${aNum}`;                            // سورة البقرة · 2:255
    case "numberedSurahName":  return `${sNum}:${aNum}  ·  ${aNum}`;                            // 2:255 · 255
    default:                   return `${sName}`;
  }
}

/* ─── Main export ─────────────────────────────────────────────────────── */

export const AYAH_BACKGROUND_OPTIONS: ReadonlyArray<{ id: AyahBackground; label: string; ar: string }> = [
  { id: "celestial",    label: "Celestial",    ar: "سماوي" },
  { id: "geometric",    label: "Geometric",    ar: "هندسي" },
  { id: "mihrab",       label: "Mihrab",       ar: "محراب" },
  { id: "calligraphic", label: "Calligraphic", ar: "خطي" },
  { id: "minimal",      label: "Minimal",      ar: "بسيط" },
  { id: "nebula",       label: "Nebula",       ar: "سديمي" },
];

export const AYAH_FONT_OPTIONS: ReadonlyArray<{ id: AyahFont; label: string; ar: string }> = [
  { id: "amiri",     label: "Amiri",      ar: "أميري" },
  { id: "kfgq",      label: "KFGQ",       ar: "عثماني" },
  { id: "arefRuqaa", label: "Aref Ruqaa", ar: "عرف رقعة" },
];

export const AYAH_COLOR_OPTIONS: ReadonlyArray<{ id: ColorTheme; label: string; ar: string }> = [
  { id: "gold",     label: "Gold",     ar: "ذهبي" },
  { id: "silver",   label: "Silver",   ar: "فضّي" },
  { id: "emerald",  label: "Emerald",  ar: "زمرّدي" },
  { id: "sapphire", label: "Sapphire", ar: "ياقوتي" },
  { id: "rose",     label: "Rose",     ar: "وردي" },
];

export const AYAH_REFERENCE_OPTIONS: ReadonlyArray<{ id: ReferenceStyle; label: string; ar: string }> = [
  { id: "numbered",          label: "Numbered",         ar: "رقم فقط" },
  { id: "surahAyah",         label: "Surah : Ayah",     ar: "السورة والآية" },
  { id: "numberedSurahName", label: "Num · Surah",      ar: "رقم · اسم السورة" },
];

export async function renderAyahPosterBlob(cfg: AyahPosterConfig): Promise<Blob> {
  await ensureFontsReady();

  const W = POSTER_W;
  const H = POSTER_H;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("canvas 2d context not available");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  // Deterministic RNG seeded by text+background so changing only
  // background gets a different but consistent composition.
  let seed = 2166136261;
  for (const c of (cfg.text + "|" + (cfg.background ?? "celestial"))) {
    seed ^= c.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  const rng = () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Theme palette — overrides the CSS vars for "what"
  // each colour-theme uses: accent, accent2, ink, bg.
  const themeName = cfg.colorTheme ?? "gold";
  const palette = PALETTES[themeName];

  // Override canvas context defaults — the renderer always works in RGB;
  // CSS-var based overrides are a no-op fallback for callers that want
  // to ignore the palette and use the live theme colour.
  const geom = getGeom();

  // 1) BACKGROUND
  const bgKind = cfg.background ?? "celestial";
  BACKGROUND_DRAWERS[bgKind](ctx, geom, palette, rng);

  // 2) FRAME (overlay on top of background)
  drawFrame(ctx, geom, palette);

  // 3) VERSE TEXT — the hero
  const fontStack = FONT_STACKS[cfg.font ?? "amiri"];
  const text = cfg.text ?? "";
  const textScale = cfg.textScale ?? 1;

  // Available text area: between top + bottom of frame, with padding
  // reserved for the reference line + transliteration + translation.
  const textTop = geom.frameY + 90;
  const textBottom = geom.frameY + geom.frameH - (cfg.showTranslation && cfg.translation ? 200 : 130);
  const textAreaH = textBottom - textTop;
  const maxWidth = geom.frameW - 200;

  const hero = pickHeroSize(ctx, text, fontStack, maxWidth, textAreaH);
  // Apply user textScale on top of auto-fit (clamped)
  const SCALE_MIN = 0.65, SCALE_MAX = 1.4;
  const scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, textScale));
  const size = Math.round(hero.size * scale);
  const lh = Math.round(hero.size * 1.62 * scale);

  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${size}px ${fontStack}`;

  const blockH = hero.lines.length * lh - lh * 0.3;
  const blockMidY = (textTop + textBottom) / 2;
  let ty = blockMidY - blockH / 2 + size * 0.85;

  for (const line of hero.lines) {
    if (!line) { ty += lh * 0.55; continue; }
    ctx.shadowColor = "rgba(0,0,0,0.60)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = rgba(palette.ink, 0.97);
    ctx.fillText(line, geom.centerX, ty);
    ctx.shadowColor = rgba(palette.accent, 0.18);
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 0;
    ctx.fillText(line, geom.centerX, ty);
    ty += lh;
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();

  // 4) OPTIONAL TRANSLITERATION + TRANSLATION
  let underStart = ty + 30;
  if (cfg.showTransliteration && cfg.transliteration) {
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const ts = 26;
    ctx.font = `italic 300 ${ts}px ${FONT_STACKS.amiri}`;
    ctx.fillStyle = rgba(palette.inkMuted, 0.78);
    const trLines = wrapLatin(ctx, cfg.transliteration, maxWidth, ts * 1.35);
    for (const l of trLines) {
      ctx.fillText(l, geom.centerX, underStart);
      underStart += ts * 1.35;
    }
    ctx.restore();
  }
  if (cfg.showTranslation && cfg.translation) {
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const ts = 30;
    ctx.font = `400 ${ts}px ${FONT_STACKS.amiri}`;
    ctx.fillStyle = rgba(palette.ink, 0.70);
    const transLines = wrapLatin(ctx, cfg.translation, maxWidth, ts * 1.4);
    for (const l of transLines) {
      ctx.fillText(l, geom.centerX, underStart + 6);
      underStart += ts * 1.4;
    }
    ctx.restore();
  }

  // 5) DIVIDER above the reference
  const refY = geom.frameY + geom.frameH - 90;
  ctx.save();
  ctx.strokeStyle = rgba(palette.accent, 0.40);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(geom.frameX + 110, refY);
  ctx.lineTo(geom.centerX - 22, refY);
  ctx.moveTo(geom.centerX + 22, refY);
  ctx.lineTo(geom.frameX + geom.frameW - 110, refY);
  ctx.stroke();
  drawCrescent(ctx, geom.centerX, refY, 6, rgba(palette.accent, 0.70), -1);
  ctx.restore();

  // 6) REFERENCE LINE — sits below the divider
  const refLine = buildReferenceLine(cfg);
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 26px ${FONT_STACKS.amiri}`;
  ctx.fillStyle = rgba(palette.accent, 0.95);
  ctx.fillText(refLine, geom.centerX, refY + 36);
  ctx.restore();

  // 7) BRAND FOOTER — optional
  if (cfg.showBrand !== false) {
    const footerY = geom.frameY + geom.frameH - 24;
    const url = (cfg.footerUrl ?? readCssVar("--athar-share-url", "athark.org") ?? "athark.org").trim();
    ctx.save();
    // Brand on right, URL on left
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.font = `700 20px ${FONT_STACKS.amiri}`;
    ctx.fillStyle = rgba(palette.accent, 0.92);
    ctx.fillText("أَثَر  ·  ATHAR", geom.frameX + geom.frameW - 8, footerY);
    // URL on left (LTR)
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.font = `500 16px ${FONT_STACKS.amiri}`;
    ctx.fillStyle = rgba(palette.inkMuted, 0.65);
    ctx.fillText(url, geom.frameX + 8, footerY);
    ctx.restore();
  }

  // → Blob
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))), "image/png");
  });
}

/* Wrap helper for Latin (translation) text. */
function wrapLatin(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lh: number,
): string[] {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth || !cur) cur = next;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}
