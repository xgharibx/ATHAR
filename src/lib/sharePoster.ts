import { formatLeadingIstiadhahBasmalah } from "@/lib/arabic";

type PosterTheme = {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  themeName: string;
};

/** Pre-load the Arabic fonts the page uses so canvas ctx.fillText renders them correctly. */
async function preloadFonts() {
  const weights = ["400", "500", "700"];
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
      b: parseInt(v.slice(4, 6), 16)
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

async function loadImage(url: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    // Local images are same-origin; remote needs CORS.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function fontSizeByLength(len: number) {
  if (len > 900) return 34;
  if (len > 520) return 42;
  if (len > 260) return 50;
  return 58;
}

function posterCandidates(themeName: string) {
  const base = import.meta.env.BASE_URL;
  const t = (themeName || "").split(/\s+/).filter(Boolean)[0] || "system";

  // These files are optional. If you add real photos, put them here:
  // public/posters/roses/01.jpg, public/posters/forest/01.jpg, etc.
  const map: Record<string, string[]> = {
    roses: ["posters/roses/01.jpg", "posters/roses/02.jpg"],
    forest: ["posters/forest/01.jpg", "posters/forest/02.jpg"],
    bees: ["posters/bees/01.jpg"],
    sapphire: ["posters/sapphire/01.jpg"],
    violet: ["posters/violet/01.jpg"],
    sunset: ["posters/sunset/01.jpg"],
    mist: ["posters/mist/01.jpg"],
    noor: ["posters/noor/01.jpg"],
    midnight: ["posters/midnight/01.jpg"],
    dark: ["posters/dark/01.jpg"],
    light: ["posters/light/01.jpg"],
    system: ["posters/system/01.jpg"]
  };

  const arr = map[t] ?? map.system;
  return (arr ?? []).map((p) => `${base}${p}`);
}

export async function renderDhikrPosterBlob(opts: {
  text: string;
  sectionTitle?: string;
  count?: number;
  footerUrl?: string;
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

  // ── 1. Background ─────────────────────────────────────────────────────────
  // Try optional theme photo, fallback to layered gradient
  let bgImage: HTMLImageElement | null = null;
  const candidates = posterCandidates(theme.themeName);
  if (candidates.length) {
    const pick = candidates[Math.floor(rng() * candidates.length)] || candidates[0];
    try { bgImage = await loadImage(pick); } catch { bgImage = null; }
  }

  if (bgImage) {
    drawCover(ctx, bgImage, 0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.50)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba(theme.accent, 0.08);
    ctx.fillRect(0, 0, W, H);
  } else {
    // Deep gradient base
    const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
    const bgRgb = parseRgb(theme.bg) ?? { r: 7, g: 8, b: 11 };
    bg.addColorStop(0, `rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})`);
    bg.addColorStop(0.55, rgba(theme.accent, 0.07));
    bg.addColorStop(1, rgba(theme.accent2, 0.12));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Ambient glows
    ctx.save();
    const g1 = ctx.createRadialGradient(W * 0.15, H * 0.1, 10, W * 0.15, H * 0.1, W * 0.7);
    g1.addColorStop(0, rgba(theme.accent, 0.28));
    g1.addColorStop(1, rgba(theme.accent, 0));
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createRadialGradient(W * 0.85, H * 0.75, 10, W * 0.85, H * 0.75, W * 0.65);
    g2.addColorStop(0, rgba(theme.accent2, 0.22));
    g2.addColorStop(1, rgba(theme.accent2, 0));
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Bokeh orbs
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const bx = rng() * W;
      const by = rng() * H;
      const br = 30 + rng() * 180;
      ctx.globalAlpha = 0.03 + rng() * 0.055;
      ctx.fillStyle = i % 2 ? theme.accent : theme.accent2;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ── 2. Top accent bar ─────────────────────────────────────────────────────
  const barH = 128;
  const barGrad = ctx.createLinearGradient(0, 0, W, 0);
  barGrad.addColorStop(0, rgba(theme.accent, 0.92));
  barGrad.addColorStop(0.5, rgba(theme.accent2, 0.85));
  barGrad.addColorStop(1, rgba(theme.accent, 0.92));
  ctx.save();
  roundRect(ctx, 0, 0, W, barH, 0);
  ctx.fillStyle = barGrad;
  ctx.fill();
  // Subtle inner shadow at bottom of bar
  const barShadow = ctx.createLinearGradient(0, barH - 16, 0, barH);
  barShadow.addColorStop(0, "rgba(0,0,0,0)");
  barShadow.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = barShadow;
  ctx.fill();
  ctx.restore();

  // App name in the bar — centered Arabic bold
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.font = `800 52px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillText("أثر", W / 2, barH / 2 + 4);
  ctx.restore();

  // Small diamond ornament left/right of the app name
  const dmX = W / 2;
  const dmY = barH / 2 + 4;
  const dmOff = 120;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.40)";
  for (const sign of [-1, 1]) {
    const cx = dmX + sign * dmOff;
    ctx.beginPath();
    ctx.moveTo(cx, dmY - 10);
    ctx.lineTo(cx + 9, dmY);
    ctx.lineTo(cx, dmY + 10);
    ctx.lineTo(cx - 9, dmY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // ── 3. Main content card ──────────────────────────────────────────────────
  const pad = 72;
  const cardX = pad;
  const cardY = barH + 72;
  const cardW = W - pad * 2;
  const cardH = H - barH - 72 - 200; // leave room for footer

  // Card background (glass)
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 52);
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.fill();
  // Glass border — accent tinted
  ctx.strokeStyle = rgba(theme.accent, 0.28);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Inner top highlight line
  ctx.save();
  roundRect(ctx, cardX + 2, cardY + 2, cardW - 4, 3, 2);
  ctx.fillStyle = rgba(theme.accent, 0.35);
  ctx.fill();
  ctx.restore();

  // ── 3a. Section title pill (top inside card) ──────────────────────────────
  const sectionTitle = (opts.sectionTitle ?? "ذكر").trim();
  const titleFont = `700 30px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.save();
  ctx.font = titleFont;
  const titleMeasure = ctx.measureText(sectionTitle);
  const pillW = Math.min(titleMeasure.width + 64, cardW - 80);
  const pillH = 54;
  const pillX = cardX + (cardW - pillW) / 2;
  const pillY = cardY + 52;

  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = rgba(theme.accent, 0.18);
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, 0.40);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.accent;
  ctx.fillText(sectionTitle, pillX + pillW / 2, pillY + pillH / 2);
  ctx.restore();

  // ── 3b. Ornamental separator ──────────────────────────────────────────────
  const sepY = cardY + 52 + pillH + 36;
  ctx.save();
  ctx.strokeStyle = rgba(theme.fg, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, sepY);
  ctx.lineTo(cardX + cardW - 60, sepY);
  ctx.stroke();
  // Small diamond in center
  const sdCx = W / 2;
  const sdCy = sepY;
  ctx.fillStyle = rgba(theme.accent, 0.55);
  ctx.beginPath();
  ctx.moveTo(sdCx, sdCy - 7); ctx.lineTo(sdCx + 7, sdCy);
  ctx.lineTo(sdCx, sdCy + 7); ctx.lineTo(sdCx - 7, sdCy);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // ── 3c. Dhikr text (centered, auto-sized) ─────────────────────────────────
  const text = formatLeadingIstiadhahBasmalah((opts.text ?? "").trim());
  const fontSize = fontSizeByLength(text.length);
  const lineHeight = Math.round(fontSize * 1.68);
  const arabicFont = `700 ${fontSize}px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;

  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.fg;
  ctx.font = arabicFont;

  const textAreaTop = sepY + 52;
  const textAreaBottom = cardY + cardH - 110;
  const maxWidth = cardW - 88;
  const centerX = W / 2;

  const paragraphs = text.split("\n");
  const allLines: string[] = [];
  for (const p of paragraphs) {
    const wrapped = wrapRtlText(ctx, p, maxWidth);
    if (allLines.length) allLines.push("");
    allLines.push(...wrapped);
  }

  // Vertically center the text block within the available area
  const totalTextH = allLines.length * lineHeight - (lineHeight - fontSize);
  const availH = textAreaBottom - textAreaTop;
  let ty = textAreaTop + Math.max(0, (availH - totalTextH) / 2) + fontSize;

  for (const line of allLines) {
    if (ty > textAreaBottom) break;
    if (!line) { ty += Math.round(lineHeight * 0.55); continue; }
    ctx.fillText(line, centerX, ty);
    ty += lineHeight;
  }
  ctx.restore();

  // ── 3d. Count badge (bottom inside card) ──────────────────────────────────
  if (opts.count && opts.count > 1) {
    const countText = `× ${opts.count}`;
    const countFont = `700 26px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
    ctx.save();
    ctx.font = countFont;
    const cw = ctx.measureText(countText).width + 52;
    const ch = 44;
    const cx = cardX + (cardW - cw) / 2;
    const cy = cardY + cardH - ch - 34;
    roundRect(ctx, cx, cy, cw, ch, ch / 2);
    ctx.fillStyle = rgba(theme.accent, 0.14);
    ctx.fill();
    ctx.strokeStyle = rgba(theme.accent, 0.32);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgba(theme.fg, 0.85);
    ctx.fillText(countText, cx + cw / 2, cy + ch / 2);
    ctx.restore();
  }

  // ── 4. Footer ─────────────────────────────────────────────────────────────
  const footerY = cardY + cardH + 52;
  const footerH = 100;
  const footerUrl = (opts.footerUrl ?? "xgharibx.github.io/ATHAR").trim();

  ctx.save();
  roundRect(ctx, cardX, footerY, cardW, footerH, 40);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill();
  ctx.strokeStyle = rgba(theme.fg, 0.10);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // App name right-aligned
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = rgba(theme.fg, 0.95);
  ctx.font = `800 30px 'Noto Naskh Arabic','Amiri','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillText("أثر • ATHAR", cardX + cardW - 44, footerY + footerH / 2);

  // URL left-aligned
  ctx.textAlign = "left";
  ctx.fillStyle = rgba(theme.fg, 0.52);
  ctx.font = `500 22px 'Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif`;
  ctx.fillText(footerUrl, cardX + 44, footerY + footerH / 2);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
