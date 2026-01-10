import { formatLeadingIstiadhahBasmalah } from "@/lib/arabic";

type PosterTheme = {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
  themeName: string;
};

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
  footerAppName?: string;
  footerUrl?: string;
  subtitle?: string;
}) {
  const theme = getThemeFromCss();
  const W = 1080;
  const H = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  const rng = mulberry32(seedFromString(`${theme.themeName}|${opts.text.slice(0, 40)}`));

  // Background: try real photo if provided, else fallback to gradient
  let bgImage: HTMLImageElement | null = null;
  const candidates = posterCandidates(theme.themeName);
  if (candidates.length) {
    const pick = candidates[Math.floor(rng() * candidates.length)] || candidates[0];
    try {
      bgImage = await loadImage(pick);
    } catch {
      bgImage = null;
    }
  }

  if (bgImage) {
    drawCover(ctx, bgImage, 0, 0, W, H);
    // Darken for readability
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 0, W, H);

    // Theme tint
    ctx.fillStyle = rgba(theme.accent, 0.10);
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, theme.bg);
    bg.addColorStop(1, rgba(theme.accent, 0.12));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Soft glows
    ctx.save();
    ctx.globalAlpha = 0.9;
    const glow1 = ctx.createRadialGradient(W * 0.25, H * 0.2, 20, W * 0.25, H * 0.2, W * 0.55);
    glow1.addColorStop(0, rgba(theme.accent, 0.22));
    glow1.addColorStop(1, rgba(theme.accent, 0));
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W * 0.75, H * 0.35, 20, W * 0.75, H * 0.35, W * 0.6);
    glow2.addColorStop(0, rgba(theme.accent2, 0.20));
    glow2.addColorStop(1, rgba(theme.accent2, 0));
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Bokeh circles
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const r = 40 + rng() * 160;
      ctx.globalAlpha = 0.05 + rng() * 0.06;
      ctx.fillStyle = i % 2 ? theme.accent : theme.accent2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Content card
  const pad = 84;
  const cardX = pad;
  const cardY = 150;
  const cardW = W - pad * 2;
  const cardH = H - 360;

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();
  ctx.strokeStyle = rgba(theme.fg, 0.14);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Subtitle
  const subtitle = (opts.subtitle ?? "ذكر").trim();
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = rgba(theme.fg, 0.78);
  ctx.font = "700 28px 'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif";
  ctx.fillText(subtitle, cardX + cardW - 52, cardY + 78);
  ctx.restore();

  // Dhikr text
  const text = formatLeadingIstiadhahBasmalah((opts.text ?? "").trim());
  const fontSize = fontSizeByLength(text.length);
  const lineHeight = Math.round(fontSize * 1.55);

  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = theme.fg;
  ctx.font = `700 ${fontSize}px 'Noto Naskh Arabic','Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif`;

  const textX = cardX + cardW - 52;
  const textTop = cardY + 150;
  const maxWidth = cardW - 104;

  const paragraphs = text.split("\n");
  const allLines: string[] = [];
  for (const p of paragraphs) {
    const lines = wrapRtlText(ctx, p, maxWidth);
    if (allLines.length) allLines.push("");
    allLines.push(...lines);
  }

  let y = textTop;
  const maxY = cardY + cardH - 110;
  for (const line of allLines) {
    if (y > maxY) break;
    if (!line) {
      y += Math.round(lineHeight * 0.6);
      continue;
    }
    ctx.fillText(line, textX, y);
    y += lineHeight;
  }
  ctx.restore();

  // Footer
  const appName = (opts.footerAppName ?? "ATHAR").trim();
  const footerUrl = (opts.footerUrl ?? "xgharibx.github.io/ATHAR").trim();

  ctx.save();
  roundRect(ctx, cardX, cardY + cardH + 44, cardW, 96, 42);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill();
  ctx.strokeStyle = rgba(theme.fg, 0.14);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = rgba(theme.fg, 0.92);
  ctx.font = "800 32px 'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif";
  ctx.fillText(appName, cardX + cardW - 52, cardY + cardH + 106);

  ctx.textAlign = "left";
  ctx.fillStyle = rgba(theme.fg, 0.64);
  ctx.font = "700 22px 'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif";
  ctx.fillText(footerUrl, cardX + 52, cardY + cardH + 106);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });

  return blob;
}
