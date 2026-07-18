/* ─────────────────────────────────────────────────────────────────────────
   Athar · Dhikr Share Poster
   ─────────────────────────────────────────────────────────────────────────
   A typography-first, restraint-led canvas poster for sharing a dhikr,
   verse, or reflection. Output is a 1080×1350 PNG (4:5 social ratio).

   Design rationale (expert notes):
   • Hierarchy: dhikr text is the hero. Everything else yields.
   • Restraint: zero stars, zero rosettes. Only crescents + thin gold
     rules + small dots — the ornament vocabulary of the Athar app itself.
   • Material: deep anthracite → warm umber gradient, plus a single
     radial light well above the text, evoking parchment lit by candle.
   • Typography: Amiri (Arabic serif) for the dhikr — generous size,
     proper alphabetic baseline, dual text shadow for embossed feel.
   • Asymmetric balance: centered hero with right-aligned label, left
     + right crescent accents that mirror but do not symmetrize.

   Public API:
   - renderDhikrPosterBlob(opts): Promise<Blob>           — main entry
   ────────────────────────────────────────────────────────────────────── */

import { formatLeadingIstiadhahBasmalah } from "@/lib/arabic";

/* ─── Theme + helpers ──────────────────────────────────────────────────── */

type Theme = { bg: string; fg: string; accent: string; accent2: string };

const FONT_SERIF = `"Amiri","Noto Naskh Arabic","Segoe UI",Tahoma,Arial,sans-serif`;
const FONT_NAKSH = `"Noto Naskh Arabic","Amiri","Segoe UI",Tahoma,Arial,sans-serif`;
const FONT_SANS = `"Segoe UI","Noto Sans Arabic",Tahoma,Arial,sans-serif`;

function readCssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function getThemeFromCss(): Theme {
  return {
    bg: readCssVar("--bg", "#0a0a0e"),
    fg: readCssVar("--fg", "#f5efe2"),
    accent: readCssVar("--accent", "#d8a657"),
    accent2: readCssVar("--accent-2", "#caa065"),
  };
}

function rgba(color: string, a: number): string {
  // Accept #rrggbb / rgb(r,g,b) / rgba(r,g,b,x). Produce rgba(r,g,b,a).
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

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicIndic(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(Math.max(0, Math.floor(n))).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);
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

/* ─── Font preloader ──────────────────────────────────────────────────── */
/**
 * Wait for every font weight + size we plan to render. The previous code
 * only preloaded 48px so large numbers like 138px fell back to the system
 * serif and looked wrong. We preload every weight + target size we use.
 */
async function ensureFontsReady(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    const families = [FONT_NAKSH, FONT_SERIF, FONT_SANS];
    const weights = ["400", "500", "600", "700", "800"];
    const sizes = ["18px", "24px", "32px", "48px", "78px", "112px", "132px"];
    const tasks: Promise<FontFace[]>[] = [];
    for (const fam of families) {
      for (const w of weights) {
        for (const s of sizes) {
          tasks.push(document.fonts.load(`${w} ${s} ${fam}`));
        }
      }
    }
    await Promise.allSettled(tasks);
    // Belt & suspenders: wait the next frame so layout settles.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  } catch {
    /* ignored — fall back to whatever the browser gives us */
  }
}

/* ─── Atmospheric primitives ──────────────────────────────────────────── */

/** Subtle starfield: only tiny dots, kept dim. Never competing with text. */
function drawStarfield(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  w: number,
  h: number,
  fg: string,
) {
  ctx.save();
  for (let i = 0; i < 180; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = rng() * 0.9 + 0.3;
    ctx.fillStyle = rgba(fg, 0.06 + rng() * 0.28);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Crescent moon (هلال). dir = 1 opens right; dir = -1 mirrors. */
function drawCrescent(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, fill: string,
  dir: 1 | -1 = 1,
) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.arc(cx + dir * r * 0.5, cy, r * 0.9, (3 * Math.PI) / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ─── Measurer for the dhikr text ─────────────────────────────────────── */

interface BlockMeasure {
  lines: string[];
  lineHeight: number;
  blockHeight: number;
  totalWidth: number;
}

/** Word-wrap Arabic (RTL) by measuring each paragraph as one block. */
function measureArabicBlock(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number,
  lineHeight: number,
): BlockMeasure {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const p of paragraphs) {
    if (!p.trim()) { lines.push(""); continue; }
    const words = p.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxWidth || !cur) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
  }
  // Average line height approximation: use measured lineHeight × line count
  // then drop the last line's trailing ascent.
  const totalWidth = lines.reduce(
    (m, l) => Math.max(m, ctx.measureText(l || " ").width), 0,
  );
  return {
    lines,
    lineHeight,
    blockHeight: lines.length * lineHeight - lineHeight * 0.3,
    totalWidth,
  };
}

/* ─── Main export ─────────────────────────────────────────────────────── */

export interface RenderDhikrPosterOpts {
  text: string;
  sectionTitle?: string;
  count?: number;
  translation?: string;
  footerUrl?: string;
}

const POSTER_W = 1080;
const POSTER_H = 1350;

export async function renderDhikrPosterBlob(
  opts: RenderDhikrPosterOpts,
): Promise<Blob> {
  await ensureFontsReady();

  const theme = getThemeFromCss();
  const W = POSTER_W;
  const H = POSTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("canvas 2d context not available");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  /* Deterministic RNG seeded so the same text produces the same poster
     (helpful for caching / consistency across renders). */
  let seed = 2166136261;
  for (let i = 0; i < opts.text.length; i++) {
    seed ^= opts.text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rng = () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ────────────────────────────────────────────────────────────────────────
  //  1. BACKGROUND  ·  deep midnight → umber gradient + a single light well
  // ────────────────────────────────────────────────────────────────────────
  const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
  baseGrad.addColorStop(0, "#070612");
  baseGrad.addColorStop(0.55, "#0c0810");
  baseGrad.addColorStop(1, "#160e0a");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // Single warm "candle light" well centered above the dhikr.
  const wellY = H * 0.42;
  const wellGrad = ctx.createRadialGradient(W / 2, wellY, 0, W / 2, wellY, W * 0.7);
  wellGrad.addColorStop(0, rgba(theme.accent, 0.18));
  wellGrad.addColorStop(0.6, rgba(theme.accent, 0.06));
  wellGrad.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = wellGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle paper-warmth grain (very low alpha) — diagonal wash only.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.55, 0);
  ctx.lineTo(0, H * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Distant starfield (tiny dots only — no flares, no crosses)
  drawStarfield(ctx, rng, W, H, theme.fg);

  // ────────────────────────────────────────────────────────────────────────
  //  2. FRAME  ·  double thin gold rule + corner accent lines (no stars)
  // ────────────────────────────────────────────────────────────────────────
  const PAD = 56;
  const fx = PAD, fy = PAD, fw = W - PAD * 2, fh = H - PAD * 2;

  // Outer thin gold rule
  ctx.save();
  const outerGrad = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
  outerGrad.addColorStop(0, rgba(theme.accent, 0.90));
  outerGrad.addColorStop(0.5, rgba(theme.accent2, 0.70));
  outerGrad.addColorStop(1, rgba(theme.accent, 0.90));
  roundRect(ctx, fx, fy, fw, fh, 32);
  ctx.strokeStyle = outerGrad;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // Inner thinner gold rule
  ctx.save();
  roundRect(ctx, fx + 18, fy + 18, fw - 36, fh - 36, 24);
  ctx.strokeStyle = rgba(theme.accent, 0.40);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // ─── Corner accent crescents + tiny inner lines ───────────────────────
  const cornerR = 22;
  ctx.save();
  ctx.strokeStyle = rgba(theme.accent, 0.85);
  ctx.lineWidth = 1.5;
  for (const [cx, cy, sx, sy] of [
    [fx + 22, fy + 22, 1, 1],
    [fx + fw - 22, fy + 22, -1, 1],
    [fx + fw - 22, fy + fh - 22, -1, -1],
    [fx + 22, fy + fh - 22, 1, -1],
  ] as const) {
    const [px, py, dx, dy] = [cx, cy, sx, sy];
    // crescent at the corner — facing inward
    ctx.save();
    const ang = Math.atan2(dy, dx);
    ctx.translate(px + dx * cornerR * 0.3, py + dy * cornerR * 0.3);
    ctx.rotate(ang + Math.PI / 2);
    drawCrescent(ctx, 0, 0, 9, rgba(theme.accent, 0.75), dx > 0 ? -1 : 1);
    ctx.restore();
    // small accent line flanking the corner
    ctx.beginPath();
    ctx.moveTo(px - dx * 4, py);
    ctx.lineTo(px + dx * 28, py);
    ctx.moveTo(px, py - dy * 4);
    ctx.lineTo(px, py + dy * 28);
    ctx.stroke();
  }
  ctx.restore();

  // Tiny crescent centered on top + bottom of frame
  drawCrescent(ctx, W / 2, fy, 10, rgba(theme.accent, 0.80));
  drawCrescent(ctx, W / 2, fy + fh, 10, rgba(theme.accent, 0.80), -1);

  // ────────────────────────────────────────────────────────────────────────
  //  3. HEADER ROW  ·  بسم الله الرحمن الرحيم
  // ────────────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // small subtle line below the basmala
  ctx.font = `400 22px ${FONT_NAKSH}`;
  ctx.fillStyle = rgba(theme.fg, 0.55);
  ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", W / 2, fy + 60);

  // underline-rule
  ctx.strokeStyle = rgba(theme.accent, 0.50);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, fy + 76);
  ctx.lineTo(W / 2 + 60, fy + 76);
  ctx.stroke();

  // App name "أثر" with subtle warm halo
  ctx.font = `800 56px ${FONT_SERIF}`;
  ctx.shadowColor = rgba(theme.accent, 0.55);
  ctx.shadowBlur = 22;
  ctx.fillStyle = rgba(theme.accent, 0.95);
  ctx.fillText("أَثَر", W / 2, fy + 138);
  ctx.shadowBlur = 0;
  // two thin gold rules + crescent under the app name
  ctx.strokeStyle = rgba(theme.accent, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 110, fy + 165);
  ctx.lineTo(W / 2 - 22, fy + 165);
  ctx.moveTo(W / 2 + 22, fy + 165);
  ctx.lineTo(W / 2 + 110, fy + 165);
  ctx.stroke();
  drawCrescent(ctx, W / 2 - 12, fy + 165, 3, rgba(theme.accent, 0.55), -1);
  drawCrescent(ctx, W / 2 + 12, fy + 165, 3, rgba(theme.accent, 0.55), 1);
  ctx.restore();

  // ────────────────────────────────────────────────────────────────────────
  //  4. SECTION LABEL  ·  small right-aligned chip with crescent
  // ────────────────────────────────────────────────────────────────────────
  const headerBottom = fy + 175;
  ctx.save();
  const sectionTitle = (opts.sectionTitle ?? "ذكر").trim();
  ctx.font = `600 28px ${FONT_NAKSH}`;
  const labelW = ctx.measureText(sectionTitle).width + 50;
  const labelH = 48;
  const labelX = W - PAD - 30 - labelW;
  const labelY = headerBottom + 22;

  // Chip bg
  roundRect(ctx, labelX, labelY, labelW, labelH, labelH / 2);
  const chipGrad = ctx.createLinearGradient(labelX, labelY, labelX + labelW, labelY);
  chipGrad.addColorStop(0, rgba(theme.accent, 0.08));
  chipGrad.addColorStop(1, rgba(theme.accent, 0.20));
  ctx.fillStyle = chipGrad;
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.55);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crescent + title text
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 26px ${FONT_NAKSH}`;
  ctx.fillStyle = rgba(theme.accent, 1);
  ctx.fillText(sectionTitle, labelX + labelW / 2 + 14, labelY + labelH / 2 + 2);
  drawCrescent(ctx, labelX + 18, labelY + labelH / 2, 6, rgba(theme.accent, 0.85), -1);
  ctx.restore();

  // Divider rule below the label
  ctx.save();
  ctx.strokeStyle = rgba(theme.accent, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx + 60, labelY + labelH + 22);
  ctx.lineTo(fx + fw - 60, labelY + labelH + 22);
  ctx.stroke();
  drawCrescent(ctx, W / 2, labelY + labelH + 22, 5, rgba(theme.accent, 0.65), -1);
  ctx.restore();

  // ────────────────────────────────────────────────────────────────────────
  //  5. DHIKR TEXT  ·  THE HERO  ·  auto-fit font size based on length
  // ────────────────────────────────────────────────────────────────────────
  const text = formatLeadingIstiadhahBasmalah((opts.text ?? "").trim());

  const footerH = 110;
  const footerY = fy + fh - footerH - 24;
  const textAreaTop = labelY + labelH + 56; // below divider
  const textAreaBottom = footerY - 36;       // above footer
  const textAreaMid = (textAreaTop + textAreaBottom) / 2;
  const maxWidth = fw - 100;

  /** Iteratively pick the largest font size that still fits. */
  function pickFontSize(): { size: number; lineHeight: number; block: BlockMeasure } {
    const test = (size: number) => {
      ctx.font = `700 ${size}px ${FONT_SERIF}`;
      ctx.direction = "rtl";
      ctx.textAlign = "center";
      return measureArabicBlock(ctx, text, maxWidth, Math.round(size * 1.62));
    };
    const MAX = 96;
    const MIN = 34;
    const availableH = textAreaBottom - textAreaTop - 80; // leave translation space
    let lo = MIN, hi = MAX, chosen = MIN;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const m = test(mid);
      if (m.blockHeight <= availableH && m.totalWidth <= maxWidth) {
        chosen = mid; lo = mid + 1;
      } else hi = mid - 1;
    }
    const block = test(chosen);
    return { size: chosen, lineHeight: block.lineHeight, block };
  }

  const { size: fontSize, lineHeight, block } = pickFontSize();

  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${fontSize}px ${FONT_SERIF}`;

  const blockStartY = textAreaMid - block.blockHeight / 2 + fontSize * 0.85;
  let ty = blockStartY;

  for (const line of block.lines) {
    if (!line) { ty += lineHeight * 0.55; continue; }
    // Dual shadow: dark drop + soft warm halo (parchment-glow feel)
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = rgba(theme.fg, 0.98);
    ctx.fillText(line, W / 2, ty);
    ctx.shadowColor = rgba(theme.accent, 0.18);
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 0;
    ctx.fillText(line, W / 2, ty);
    ty += lineHeight;
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();

  // Optional translation block (Latin, smaller, dimmed)
  const translation = (opts.translation ?? "").trim();
  if (translation) {
    ctx.save();
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `italic 300 ${Math.max(18, fontSize * 0.42)}px ${FONT_SANS}`;
    ctx.fillStyle = rgba(theme.fg, 0.65);
    const transLines = measureArabicBlock(ctx, translation, maxWidth, 30).lines; // re-wrap w/ LTR ok
    let ty2 = ty + 16;
    for (const ln of transLines) {
      if (ty2 > textAreaBottom - 10) break;
      ctx.fillText(ln, W / 2, ty2);
      ty2 += 30;
    }
    ctx.restore();
  }

  // ────────────────────────────────────────────────────────────────────────
  //  6. BOTTOM SECTION  ·  a single elegant horizontal divider + count
  // ────────────────────────────────────────────────────────────────────────

  // Decorative double-rule with crescent center
  const ruleY = footerY - 78;
  ctx.save();
  ctx.strokeStyle = rgba(theme.accent, 0.50);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fx + 100, ruleY);
  ctx.lineTo(W / 2 - 22, ruleY);
  ctx.moveTo(W / 2 + 22, ruleY);
  ctx.lineTo(fx + fw - 100, ruleY);
  ctx.stroke();
  drawCrescent(ctx, W / 2, ruleY, 6, rgba(theme.accent, 0.75), -1);
  // second thinner rule
  ctx.strokeStyle = rgba(theme.accent, 0.25);
  ctx.beginPath();
  ctx.moveTo(fx + 100, ruleY + 6);
  ctx.lineTo(fx + fw - 100, ruleY + 6);
  ctx.stroke();
  ctx.restore();

  // Count (in Arabic-Indic) — two flanking crescents, big bold number
  if (opts.count && opts.count > 1) {
    const countCY = ruleY + 56;
    const arNum = toArabicIndic(opts.count);
    ctx.save();
    // Two accent crescents
    drawCrescent(ctx, W / 2 - 184, countCY, 14, rgba(theme.accent, 0.90), -1);
    drawCrescent(ctx, W / 2 + 184, countCY, 14, rgba(theme.accent, 0.90), 1);
    // "تكرار" mini label above the number
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 18px ${FONT_NAKSH}`;
    ctx.fillStyle = rgba(theme.fg, 0.62);
    ctx.fillText("تَكْرَار", W / 2, countCY - 38);
    // Big Arabic-Indic number with warm halo
    ctx.font = `800 78px ${FONT_NAKSH}`;
    ctx.shadowColor = rgba(theme.accent, 0.55);
    ctx.shadowBlur = 18;
    ctx.fillStyle = rgba(theme.accent, 1);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(arNum, W / 2, countCY + 8);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ────────────────────────────────────────────────────────────────────────
  //  7. FOOTER  ·  minimal: brand left, URL right, no ribbon
  // ────────────────────────────────────────────────────────────────────────
  const footerUrl = (opts.footerUrl ?? "athark.org").trim();
  ctx.save();
  ctx.font = `400 22px ${FONT_SANS}`;
  // left: brand
  ctx.direction = "rtl";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = rgba(theme.accent, 0.90);
  ctx.font = `700 22px ${FONT_SERIF}`;
  ctx.fillText("أَثَر  ·  ATHAR", fx + 30, footerY + footerH / 2);

  // right: URL
  ctx.direction = "ltr";
  ctx.textAlign = "right";
  ctx.font = `500 20px ${FONT_SANS}`;
  ctx.fillStyle = rgba(theme.fg, 0.65);
  ctx.fillText(footerUrl, fx + fw - 30, footerY + footerH / 2);
  ctx.restore();

  // → output
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
      "image/png",
    );
  });
}
