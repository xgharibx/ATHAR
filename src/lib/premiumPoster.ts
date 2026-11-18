/* ─────────────────────────────────────────────────────────────────────────
   Athar · Premium share image
   ─────────────────────────────────────────────────────────────────────────
   One design for every image Athar shares: an ayah, a dhikr, a hadith or a
   personal reflection. Built like a printed card from a fine Mushaf:

   • A deep, quiet ground: a two-tone gradient, a soft light behind the
     text, an eight-point-star lattice that fades out before it reaches the
     words, a fine paper grain and a vignette.
   • A double hairline frame with eight-point stars at the corners.
   • A cartouche at the top naming the surah, the adhkar or the book.
   • The words as the hero, sized to fill the space and never crowd it:
     the Mushaf's own Uthmani script for the Quran, Amiri for adhkar, Naskh
     for hadith and reflections. An ayah closes with an ornamented medallion
     holding its number.
   • A translation set in a book serif under a small ornament, never cut
     off: the Arabic gives up size first so the translation always fits.
   • A restrained brand lockup at the foot.

   Five palettes (midnight, emerald, parchment, maroon, slate) and three
   sizes: a 4:5 post, a 9:16 story and a 1:1 square. Arabic numbers
   throughout.
   ────────────────────────────────────────────────────────────────────── */

export type PosterKind = "ayah" | "dhikr" | "hadith" | "reflection";
export type PosterThemeId = "midnight" | "emerald" | "parchment" | "maroon" | "slate";
export type PosterFormat = "portrait" | "story" | "square";
export type PosterScript = "uthmani" | "amiri" | "naskh";

export type PosterContent = {
  kind: PosterKind;
  /** The words: the ayah, the dhikr, the hadith's matn or the reflection. */
  text: string;
  /** Named in the cartouche: «سورة الرعد», «أذكار الصباح», «صحيح البخاري». */
  heading?: string;
  /** A small line under the words: «حديث ١» or «الرعد · ١٣:٢٨». */
  reference?: string;
  /** Closes an ayah with a medallion holding this number. */
  ayahNumber?: number;
  /** How many times a dhikr is said; shown when more than once. */
  count?: number;
  translation?: string;
  translationDirection?: "ltr" | "rtl";
  /** Provider and edition credit for a translation. */
  translationAttribution?: string;
  /** A hadith's grade, e.g. «صحيح». */
  grade?: string;
  /** A reflection's verse, quoted small above it. */
  quote?: string;
};

export type PosterStyle = {
  theme?: PosterThemeId;
  format?: PosterFormat;
  script?: PosterScript;
  /** 0.8–1.25: larger or smaller words, still fitted to the space. */
  textScale?: number;
  showTranslation?: boolean;
  footerUrl?: string;
};

type Palette = {
  id: PosterThemeId;
  ar: string;
  light: boolean;
  bgTop: string;
  bgBottom: string;
  glow: string;
  accent: string;
  ink: string;
  inkSoft: string;
  /** For the swatch in the composer. */
  swatch: string;
};

export const POSTER_THEMES: readonly Palette[] = [
  {
    id: "midnight", ar: "ليلي", light: false,
    bgTop: "#0B1120", bgBottom: "#060912", glow: "#1C2B4D",
    accent: "#D6B26A", ink: "#F4ECDC", inkSoft: "rgba(244,236,220,0.66)",
    swatch: "linear-gradient(160deg,#1C2B4D,#060912 70%)",
  },
  {
    id: "emerald", ar: "زمرّدي", light: false,
    bgTop: "#06261F", bgBottom: "#031511", glow: "#0F4A3B",
    accent: "#D9B970", ink: "#F2ECDD", inkSoft: "rgba(242,236,221,0.68)",
    swatch: "linear-gradient(160deg,#0F4A3B,#031511 70%)",
  },
  {
    id: "parchment", ar: "رَقّ", light: true,
    bgTop: "#F7EFDF", bgBottom: "#EADBBE", glow: "#FFF9EC",
    accent: "#9A7434", ink: "#2A2017", inkSoft: "rgba(42,32,23,0.66)",
    swatch: "linear-gradient(160deg,#FFF9EC,#EADBBE 70%)",
  },
  {
    id: "maroon", ar: "عقيقي", light: false,
    bgTop: "#230B12", bgBottom: "#13060A", glow: "#4C1A28",
    accent: "#E2BA74", ink: "#F7ECDD", inkSoft: "rgba(247,236,221,0.68)",
    swatch: "linear-gradient(160deg,#4C1A28,#13060A 70%)",
  },
  {
    id: "slate", ar: "فضّي", light: false,
    bgTop: "#15181D", bgBottom: "#0B0D10", glow: "#2C323C",
    accent: "#CBD1DA", ink: "#F1F3F6", inkSoft: "rgba(241,243,246,0.64)",
    swatch: "linear-gradient(160deg,#2C323C,#0B0D10 70%)",
  },
];

export const POSTER_FORMATS: ReadonlyArray<{ id: PosterFormat; ar: string; width: number; height: number }> = [
  { id: "portrait", ar: "منشور", width: 1080, height: 1350 },
  { id: "story", ar: "قصة", width: 1080, height: 1920 },
  { id: "square", ar: "مربع", width: 1080, height: 1080 },
];

export const POSTER_SCRIPTS: ReadonlyArray<{ id: PosterScript; ar: string }> = [
  { id: "uthmani", ar: "عثماني" },
  { id: "amiri", ar: "أميري" },
  { id: "naskh", ar: "نسخ" },
];

const SCRIPT_FONT: Record<PosterScript, { family: string; weight: number; lineHeight: number }> = {
  uthmani: { family: `"UthmanicHafs","Amiri Quran","Amiri",serif`, weight: 400, lineHeight: 1.95 },
  amiri: { family: `"Amiri","Amiri Quran",serif`, weight: 700, lineHeight: 1.85 },
  naskh: { family: `"Noto Naskh Arabic","Amiri",serif`, weight: 500, lineHeight: 1.8 },
};

const FONT_NASKH = `"Noto Naskh Arabic","Amiri",serif`;
const FONT_AMIRI = `"Amiri","Noto Naskh Arabic",serif`;
const FONT_SERIF_LATIN = `"Noto Serif",Georgia,"Times New Roman",serif`;
const FONT_SANS = `"Noto Sans","Segoe UI",Roboto,Arial,sans-serif`;

const DEFAULT_SCRIPT: Record<PosterKind, PosterScript> = {
  ayah: "uthmani",
  dhikr: "amiri",
  hadith: "naskh",
  reflection: "naskh",
};

/** Largest size of the words in a 4:5 post, before fitting. */
const MAX_SIZE: Record<PosterKind, number> = { ayah: 78, dhikr: 74, hadith: 50, reflection: 52 };
const MIN_SIZE: Record<PosterKind, number> = { ayah: 30, dhikr: 30, hadith: 25, reflection: 26 };

const MEDALLION_TOKEN = "\u0000medallion";

/* ─── Small helpers ───────────────────────────────────────────────────── */

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Western digits as Arabic-Indic ones, the way Arabic text writes them. */
export function arabicDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)] ?? d);
}

/** «مرتان», «٣ مرات», «١٠٠ مرة» — or nothing for once. */
export function timesLabel(count: number | undefined): string {
  if (!count || !Number.isFinite(count) || count <= 1) return "";
  const n = Math.floor(count);
  if (n === 2) return "مرتان";
  if (n >= 3 && n <= 10) return `${arabicDigits(n)} مرات`;
  return `${arabicDigits(n)} مرة`;
}

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function seededRandom(text: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** The eight-point star (two squares, one turned 45°) as a path. */
function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const inner = r * 0.7654;
  ctx.beginPath();
  for (let i = 0; i < 16; i += 1) {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** A small diamond, for ornaments on the frame and dividers. */
function diamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.7, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.7, cy);
  ctx.closePath();
}

/* ─── Fonts ───────────────────────────────────────────────────────────── */

/**
 * Canvas text falls back to a system font when the face is not loaded yet,
 * so every face and weight is asked for first (with a time limit: a missing
 * web font must never hold the share up).
 */
async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  const faces = [
    `400 60px "UthmanicHafs"`,
    `400 60px "Amiri Quran"`,
    `400 60px "Amiri"`,
    `700 60px "Amiri"`,
    `400 40px "Noto Naskh Arabic"`,
    `500 40px "Noto Naskh Arabic"`,
    `700 40px "Noto Naskh Arabic"`,
  ];
  const loads = Promise.allSettled(faces.map((face) => document.fonts.load(face)));
  await Promise.race([loads, new Promise((resolve) => setTimeout(resolve, 2500))]);
}

/* ─── Wrapping and fitting ────────────────────────────────────────────── */

function tokenWidth(ctx: CanvasRenderingContext2D, token: string, medallion: number): number {
  return token === MEDALLION_TOKEN ? medallion : ctx.measureText(token).width;
}

/**
 * Word-wrap to `maxWidth`. A medallion token takes its own width and stays
 * on the line of the last word.
 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, medallion = 0): string[][] {
  const lines: string[][] = [];
  const space = ctx.measureText(" ").width || maxWidth * 0.01;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let line: string[] = [];
    let width = 0;
    for (const word of words) {
      const w = tokenWidth(ctx, word, medallion);
      const next = line.length ? width + space + w : w;
      if (line.length && next > maxWidth && word !== MEDALLION_TOKEN) {
        lines.push(line);
        line = [word];
        width = w;
      } else {
        line.push(word);
        width = next;
      }
    }
    if (line.length) lines.push(line);
  }
  return lines;
}

type Fitted = {
  size: number;
  family: string;
  weight: number;
  lineHeight: number;
  lines: string[][];
  medallion: number;
  translationSize: number;
  translationLines: string[];
  height: number;
};

/* ─── The render ──────────────────────────────────────────────────────── */

export function posterSize(format: PosterFormat = "portrait"): { width: number; height: number } {
  const found = POSTER_FORMATS.find((f) => f.id === format) ?? POSTER_FORMATS[0];
  return { width: found.width, height: found.height };
}

export function posterPalette(theme: PosterThemeId = "midnight"): Palette {
  return POSTER_THEMES.find((t) => t.id === theme) ?? POSTER_THEMES[0];
}

export async function renderPremiumPoster(content: PosterContent, style: PosterStyle = {}): Promise<Blob> {
  await ensureFonts();
  const canvas = drawPremiumPoster(content, style);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas toBlob returned null"))), "image/png");
  });
}

/** Draw the poster onto a new canvas (exported for previews and tests). */
export function drawPremiumPoster(content: PosterContent, style: PosterStyle = {}): HTMLCanvasElement {
  const format = style.format ?? "portrait";
  const { width: W, height: H } = posterSize(format);
  const palette = posterPalette(style.theme);
  const script = style.script ?? DEFAULT_SCRIPT[content.kind];
  const font = SCRIPT_FONT[script];
  const footerUrl = (style.footerUrl ?? "athark.org").replace(/^https?:\/\//, "").replace(/^www\./, "");
  const random = seededRandom(content.text);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context not available");

  const frameInset = format === "story" ? 56 : 44;
  const isStory = format === "story";
  const isSquare = format === "square";

  /* 1 · Ground ------------------------------------------------------- */
  const ground = ctx.createLinearGradient(0, 0, 0, H);
  ground.addColorStop(0, palette.bgTop);
  ground.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  const glowY = H * (isStory ? 0.47 : 0.48);
  const glow = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, W * 0.72);
  glow.addColorStop(0, withAlpha(palette.glow, palette.light ? 0.9 : 0.75));
  glow.addColorStop(1, withAlpha(palette.glow, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawLattice(ctx, W, H, palette);
  drawGrain(ctx, W, H, palette, random);

  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, palette.light ? "rgba(90,60,20,0.16)" : "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  /* 2 · Frame -------------------------------------------------------- */
  drawFrame(ctx, W, H, frameInset, palette);

  /* 3 · Header cartouche --------------------------------------------- */
  const headerY = frameInset + (isStory ? 150 : isSquare ? 74 : 96);
  const heading = (content.heading ?? "").trim();
  if (heading) drawCartouche(ctx, W / 2, headerY, arabicDigits(heading), palette);
  else drawOrnament(ctx, W / 2, headerY, palette);

  /* 4 · Footer brand ------------------------------------------------- */
  const footerY = H - frameInset - (isStory ? 150 : isSquare ? 66 : 84);
  drawBrand(ctx, W / 2, footerY, footerUrl, palette);

  /* 5 · The words ---------------------------------------------------- */
  const boxTop = headerY + (isSquare ? 62 : 84);
  const boxBottom = footerY - (isSquare ? 64 : 86);
  const maxWidth = W - (frameInset + (isSquare ? 86 : 96)) * 2;
  const showTranslation = style.showTranslation !== false && Boolean(content.translation?.trim());

  const quote = content.kind === "reflection" ? (content.quote ?? "").trim() : "";
  const quoteSize = 30;
  const quoteLines = quote ? limitLines(wrapPlain(ctx, `﴿${quote}﴾`, `400 ${quoteSize}px ${FONT_AMIRI}`, maxWidth), 3) : [];
  const quoteHeight = quoteLines.length ? quoteLines.length * quoteSize * 1.7 + 46 : 0;

  const reference = referenceLine(content);
  const referenceHeight = reference ? 70 : 0;

  const fitted = fitWords(ctx, {
    content, font, maxWidth,
    available: boxBottom - boxTop - quoteHeight - referenceHeight,
    scale: Math.max(0.8, Math.min(1.25, style.textScale ?? 1)) * (isStory ? 1.1 : isSquare ? 0.9 : 1),
    translation: showTranslation ? content.translation!.trim() : "",
    translationDirection: content.translationDirection ?? "ltr",
    attribution: showTranslation ? (content.translationAttribution ?? "").trim() : "",
  });

  const blockHeight = quoteHeight + fitted.height + referenceHeight;
  let y = boxTop + Math.max(0, (boxBottom - boxTop - blockHeight) / 2);

  if (quoteLines.length) {
    ctx.save();
    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `400 ${quoteSize}px ${FONT_AMIRI}`;
    ctx.fillStyle = palette.inkSoft;
    for (const line of quoteLines) {
      y += quoteSize * 1.7;
      ctx.fillText(line, W / 2, y - quoteSize * 0.45);
    }
    ctx.restore();
    y += 10;
    drawDivider(ctx, W / 2, y + 12, palette);
    y += 36;
  }

  y = drawWords(ctx, W, y, fitted, content, palette);

  if (fitted.translationLines.length) {
    y += 26;
    drawDivider(ctx, W / 2, y, palette);
    y += 30;
    ctx.save();
    const rtl = content.translationDirection === "rtl";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = rtl
      ? `400 ${fitted.translationSize}px ${FONT_NASKH}`
      : `italic 400 ${fitted.translationSize}px ${FONT_SERIF_LATIN}`;
    ctx.fillStyle = palette.inkSoft;
    for (const line of fitted.translationLines) {
      y += fitted.translationSize * 1.5;
      ctx.fillText(line, W / 2, y - fitted.translationSize * 0.35);
    }
    ctx.restore();
    const attribution = (content.translationAttribution ?? "").trim();
    if (attribution) {
      y += 34;
      ctx.save();
      ctx.direction = "ltr";
      ctx.textAlign = "center";
      ctx.font = `400 18px ${FONT_SANS}`;
      ctx.fillStyle = withAlpha(palette.light ? "#2A2017" : "#FFFFFF", 0.42);
      ctx.fillText(attribution, W / 2, y);
      ctx.restore();
    }
  }

  if (reference) {
    y += content.kind === "dhikr" ? 66 : 54;
    drawReference(ctx, W / 2, y, reference, content.kind === "dhikr", palette);
  }

  return canvas;
}

/* ─── Pieces ──────────────────────────────────────────────────────────── */

function referenceLine(content: PosterContent): string {
  if (content.kind === "dhikr") return timesLabel(content.count);
  const parts: string[] = [];
  const reference = (content.reference ?? "").trim();
  if (reference) parts.push(hasArabic(reference) || /^[\d:\s.·-]+$/.test(reference) ? arabicDigits(reference) : reference);
  if (content.kind === "hadith" && content.grade?.trim()) parts.push(content.grade.trim());
  // An ayah with a medallion already carries its number.
  if (content.kind === "ayah" && content.ayahNumber && parts.length === 0) return "";
  return parts.join("  ·  ");
}

function wrapPlain(ctx: CanvasRenderingContext2D, text: string, fontSpec: string, maxWidth: number): string[] {
  ctx.save();
  ctx.font = fontSpec;
  const lines = wrap(ctx, text, maxWidth).map((line) => line.join(" "));
  ctx.restore();
  return lines;
}

function limitLines(lines: string[], max: number): string[] {
  if (max <= 0) return [];
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = `${kept[max - 1].replace(/[.،,]?\s*$/, "")}…`;
  return kept;
}

function fitWords(
  ctx: CanvasRenderingContext2D,
  options: {
    content: PosterContent;
    font: { family: string; weight: number; lineHeight: number };
    maxWidth: number;
    available: number;
    scale: number;
    translation: string;
    translationDirection: "ltr" | "rtl";
    attribution: string;
  },
): Fitted {
  const { content, font, maxWidth, available, scale } = options;
  const kind = content.kind;
  const withMedallion = kind === "ayah" && Boolean(content.ayahNumber);
  const text = withMedallion ? `${content.text.trim()} ${MEDALLION_TOKEN}` : content.text.trim();
  const largest = Math.round(MAX_SIZE[kind] * scale);
  const smallest = MIN_SIZE[kind];
  const translationFont = (size: number) => options.translationDirection === "rtl"
    ? `400 ${size}px ${FONT_NASKH}`
    : `italic 400 ${size}px ${FONT_SERIF_LATIN}`;

  const measure = (size: number, translationSize: number, translationMax: number): Fitted => {
    ctx.save();
    ctx.font = `${font.weight} ${size}px ${font.family}`;
    ctx.direction = "rtl";
    const medallion = withMedallion ? size * 0.92 : 0;
    const lines = wrap(ctx, text, maxWidth, medallion);
    ctx.restore();
    let translationLines: string[] = [];
    if (options.translation) {
      translationLines = limitLines(wrapPlain(ctx, options.translation, translationFont(translationSize), maxWidth - 40), translationMax);
    }
    const wordsHeight = lines.length * size * font.lineHeight;
    const translationHeight = translationLines.length
      ? 56 + translationLines.length * translationSize * 1.5 + (options.attribution ? 34 : 0)
      : 0;
    return {
      size, family: font.family, weight: font.weight, lineHeight: font.lineHeight,
      lines, medallion, translationSize, translationLines,
      height: wordsHeight + translationHeight,
    };
  };

  for (let size = largest; size >= smallest; size -= 2) {
    const translationSize = Math.max(24, Math.min(34, Math.round(size * 0.46)));
    const fitted = measure(size, translationSize, 99);
    if (fitted.height <= available) return fitted;
  }
  // Still too long at the smallest size: keep the whole Arabic and give the
  // translation the room that is left, trimmed with an ellipsis.
  const base = measure(smallest, 24, 0);
  if (!options.translation) return base;
  const spare = available - base.height - 56 - (options.attribution ? 34 : 0);
  const maxLines = Math.max(1, Math.floor(spare / (24 * 1.5)));
  return measure(smallest, 24, maxLines);
}

function drawWords(
  ctx: CanvasRenderingContext2D,
  W: number,
  startY: number,
  fitted: Fitted,
  content: PosterContent,
  palette: Palette,
): number {
  const { size, lineHeight, lines, medallion } = fitted;
  let y = startY;
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fitted.weight} ${size}px ${fitted.family}`;
  ctx.fillStyle = palette.ink;
  if (!palette.light) {
    ctx.shadowColor = "rgba(0,0,0,0.38)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;
  }
  const space = ctx.measureText(" ").width;
  const step = size * lineHeight;
  for (const line of lines) {
    y += step;
    const baseline = y - step * 0.32;
    const words = line.filter((token) => token !== MEDALLION_TOKEN);
    const text = words.join(" ");
    if (line.includes(MEDALLION_TOKEN)) {
      const textWidth = text ? ctx.measureText(text).width : 0;
      const gap = text ? space * 1.4 : 0;
      const total = textWidth + gap + medallion;
      if (text) ctx.fillText(text, W / 2 + total / 2 - textWidth / 2, baseline);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0)";
      drawMedallion(ctx, W / 2 - total / 2 + medallion / 2, baseline - size * 0.3, medallion / 2, content.ayahNumber ?? 0, palette);
      ctx.restore();
    } else {
      ctx.fillText(text, W / 2, baseline);
    }
  }
  ctx.restore();
  return y;
}

function drawLattice(ctx: CanvasRenderingContext2D, W: number, H: number, palette: Palette) {
  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = H;
  const lc = layer.getContext("2d");
  if (!lc) return;
  const cell = 120;
  lc.strokeStyle = palette.accent;
  lc.lineWidth = 1.4;
  for (let row = -1; row * cell < H + cell; row += 1) {
    for (let col = -1; col * cell < W + cell; col += 1) {
      const cx = col * cell + (row % 2 === 0 ? 0 : cell / 2);
      const cy = row * cell * 0.86;
      starPath(lc, cx, cy, cell * 0.3);
      lc.stroke();
      diamondPath(lc, cx + cell / 2, cy, 4);
      lc.stroke();
    }
  }
  // Fade the lattice out towards the middle, where the words are.
  lc.globalCompositeOperation = "destination-in";
  const fade = lc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.62);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  lc.fillStyle = fade;
  lc.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = palette.light ? 0.13 : 0.1;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

function drawGrain(ctx: CanvasRenderingContext2D, W: number, H: number, palette: Palette, random: () => number) {
  ctx.save();
  ctx.fillStyle = palette.light ? "rgba(60,40,10,0.05)" : "rgba(255,255,255,0.035)";
  const count = Math.round((W * H) / 520);
  for (let i = 0; i < count; i += 1) {
    const size = random() < 0.85 ? 1 : 2;
    ctx.fillRect(random() * W, random() * H, size, size);
  }
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, inset: number, palette: Palette) {
  ctx.save();
  ctx.strokeStyle = withAlpha(palette.accent, 0.6);
  ctx.lineWidth = 2;
  roundedRect(ctx, inset, inset, W - inset * 2, H - inset * 2, 26);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(palette.accent, 0.24);
  ctx.lineWidth = 1;
  roundedRect(ctx, inset + 12, inset + 12, W - (inset + 12) * 2, H - (inset + 12) * 2, 18);
  ctx.stroke();

  // Eight-point stars where the frame turns, on a patch of the ground.
  const corners: Array<[number, number, string]> = [
    [inset + 6, inset + 6, palette.bgTop],
    [W - inset - 6, inset + 6, palette.bgTop],
    [inset + 6, H - inset - 6, palette.bgBottom],
    [W - inset - 6, H - inset - 6, palette.bgBottom],
  ];
  for (const [x, y, ground] of corners) {
    ctx.fillStyle = ground;
    starPath(ctx, x, y, 17);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.accent, 0.85);
    ctx.lineWidth = 1.6;
    starPath(ctx, x, y, 14);
    ctx.stroke();
    ctx.fillStyle = withAlpha(palette.accent, 0.85);
    diamondPath(ctx, x, y, 4);
    ctx.fill();
  }
  // A diamond at the middle of the top and bottom edges.
  for (const [y, ground] of [[inset, palette.bgTop], [H - inset, palette.bgBottom]] as Array<[number, string]>) {
    ctx.fillStyle = ground;
    diamondPath(ctx, W / 2, y, 13);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.accent, 0.8);
    ctx.lineWidth = 1.5;
    diamondPath(ctx, W / 2, y, 10);
    ctx.stroke();
  }
  ctx.restore();
}

/** The name panel at the top: a pill with pointed ends and a double rule. */
function drawCartouche(ctx: CanvasRenderingContext2D, cx: number, cy: number, label: string, palette: Palette) {
  ctx.save();
  ctx.font = `700 30px ${FONT_NASKH}`;
  ctx.direction = "rtl";
  const textWidth = ctx.measureText(label).width;
  const w = Math.max(220, Math.min(760, textWidth + 110));
  const h = 66;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.fillStyle = withAlpha(palette.accent, palette.light ? 0.1 : 0.08);
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.75);
  ctx.lineWidth = 1.6;
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(palette.accent, 0.3);
  ctx.lineWidth = 1;
  roundedRect(ctx, x + 6, y + 6, w - 12, h - 12, (h - 12) / 2);
  ctx.stroke();

  // Pointed ends and the rules running out to the frame.
  for (const side of [-1, 1]) {
    const tip = cx + side * (w / 2 + 16);
    ctx.fillStyle = withAlpha(palette.accent, 0.85);
    diamondPath(ctx, tip, cy, 7);
    ctx.fill();
    const rule = ctx.createLinearGradient(tip + side * 10, cy, tip + side * 150, cy);
    rule.addColorStop(0, withAlpha(palette.accent, 0.55));
    rule.addColorStop(1, withAlpha(palette.accent, 0));
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tip + side * 12, cy);
    ctx.lineTo(tip + side * 150, cy);
    ctx.stroke();
  }

  ctx.fillStyle = palette.light ? palette.accent : withAlpha(palette.accent, 0.98);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 2);
  ctx.restore();
}

function drawOrnament(ctx: CanvasRenderingContext2D, cx: number, cy: number, palette: Palette) {
  ctx.save();
  ctx.strokeStyle = withAlpha(palette.accent, 0.8);
  ctx.lineWidth = 1.6;
  starPath(ctx, cx, cy, 16);
  ctx.stroke();
  ctx.fillStyle = withAlpha(palette.accent, 0.85);
  diamondPath(ctx, cx, cy, 5);
  ctx.fill();
  ctx.restore();
}

/** A short rule with a star at its centre, between the words and the translation. */
function drawDivider(ctx: CanvasRenderingContext2D, cx: number, cy: number, palette: Palette) {
  ctx.save();
  for (const side of [-1, 1]) {
    const rule = ctx.createLinearGradient(cx + side * 18, cy, cx + side * 130, cy);
    rule.addColorStop(0, withAlpha(palette.accent, 0.6));
    rule.addColorStop(1, withAlpha(palette.accent, 0));
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + side * 18, cy);
    ctx.lineTo(cx + side * 130, cy);
    ctx.stroke();
  }
  ctx.fillStyle = withAlpha(palette.accent, 0.85);
  starPath(ctx, cx, cy, 8);
  ctx.fill();
  ctx.restore();
}

/** The ayah-end medallion: a star around a ring, with the number inside. */
function drawMedallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, number: number, palette: Palette) {
  ctx.save();
  ctx.fillStyle = withAlpha(palette.accent, palette.light ? 0.12 : 0.1);
  starPath(ctx, cx, cy, r);
  ctx.fill();
  ctx.strokeStyle = withAlpha(palette.accent, 0.9);
  ctx.lineWidth = Math.max(1.4, r * 0.06);
  starPath(ctx, cx, cy, r);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(palette.accent, 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  if (number > 0) {
    const label = arabicDigits(number);
    const size = r * (label.length >= 3 ? 0.62 : 0.78);
    ctx.font = `700 ${size}px ${FONT_NASKH}`;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.fillText(label, cx, cy + size * 0.08);
  }
  ctx.restore();
}

/** The line under the words: a dhikr's count as a pill, or a quiet reference. */
function drawReference(ctx: CanvasRenderingContext2D, cx: number, cy: number, label: string, pill: boolean, palette: Palette) {
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${pill ? 28 : 26}px ${FONT_NASKH}`;
  const w = ctx.measureText(label).width;
  if (pill) {
    const pw = w + 64;
    const ph = 52;
    ctx.fillStyle = withAlpha(palette.accent, palette.light ? 0.14 : 0.12);
    roundedRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.accent, 0.6);
    ctx.lineWidth = 1.2;
    roundedRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
    ctx.stroke();
    ctx.fillStyle = palette.accent;
  } else {
    ctx.fillStyle = withAlpha(palette.accent, 0.92);
    for (const side of [-1, 1]) {
      ctx.fillStyle = withAlpha(palette.accent, 0.7);
      diamondPath(ctx, cx + side * (w / 2 + 22), cy, 5);
      ctx.fill();
    }
    ctx.fillStyle = withAlpha(palette.accent, 0.95);
  }
  ctx.fillText(label, cx, cy + 2);
  ctx.restore();
}

/** «أثر» with its star, the address underneath, over a short rule. */
function drawBrand(ctx: CanvasRenderingContext2D, cx: number, cy: number, url: string, palette: Palette) {
  ctx.save();
  const rule = ctx.createLinearGradient(cx - 90, 0, cx + 90, 0);
  rule.addColorStop(0, withAlpha(palette.accent, 0));
  rule.addColorStop(0.5, withAlpha(palette.accent, 0.5));
  rule.addColorStop(1, withAlpha(palette.accent, 0));
  ctx.strokeStyle = rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 90, cy - 40);
  ctx.lineTo(cx + 90, cy - 40);
  ctx.stroke();

  ctx.font = `700 36px ${FONT_AMIRI}`;
  ctx.direction = "rtl";
  ctx.textBaseline = "middle";
  const nameWidth = ctx.measureText("أثر").width;
  const mark = 13;
  const gap = 14;
  const total = nameWidth + gap + mark * 2;
  const markX = cx - total / 2 + mark;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.8;
  starPath(ctx, markX, cy, mark);
  ctx.stroke();
  ctx.fillStyle = palette.accent;
  diamondPath(ctx, markX, cy, mark * 0.42);
  ctx.fill();
  ctx.fillStyle = palette.ink;
  ctx.textAlign = "center";
  ctx.fillText("أثر", cx + total / 2 - nameWidth / 2, cy + 2);

  ctx.direction = "ltr";
  ctx.font = `500 20px ${FONT_SANS}`;
  ctx.fillStyle = palette.inkSoft;
  ctx.fillText(url, cx, cy + 40);
  ctx.restore();
}
