type PosterTheme = {
  bg: string;
  fg: string;
  accent: string;
  accent2: string;
};

function readCssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getThemeFromCss(): PosterTheme {
  const bg = readCssVar("--bg") || "#07080b";
  const fg = readCssVar("--fg") || "#f5f7ff";
  const accent = readCssVar("--accent") || "#ffd780";
  const accent2 = readCssVar("--accent-2") || accent;
  return { bg, fg, accent, accent2 };
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

function addNoise(ctx: CanvasRenderingContext2D, w: number, h: number, opacity = 0.05) {
  const sw = 180;
  const sh = Math.round((h / w) * sw);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const c = canvas.getContext("2d");
  if (!c) return;

  const img = c.createImageData(sw, sh);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = Math.floor(255 * opacity);
  }
  c.putImageData(img, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(canvas, 0, 0, w, h);
  ctx.restore();
}

function fontSizeByLength(len: number) {
  if (len > 900) return 34;
  if (len > 520) return 42;
  if (len > 260) return 50;
  return 58;
}

export async function renderDhikrPosterPng(opts: {
  text: string;
  countLabel?: string;
  footer?: string;
}) {
  const theme = getThemeFromCss();

  const W = 1080;
  const H = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  // Background gradient (calm / nature-like)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, theme.bg);
  bg.addColorStop(1, rgba(theme.accent, 0.12));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft "breathing" glows (static, but organic)
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
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = 40 + Math.random() * 160;
    ctx.globalAlpha = 0.05 + Math.random() * 0.06;
    ctx.fillStyle = i % 2 ? theme.accent : theme.accent2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  addNoise(ctx, W, H, 0.05);

  // Content card
  const pad = 84;
  const cardX = pad;
  const cardY = 140;
  const cardW = W - pad * 2;
  const cardH = H - 340;

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fillStyle = rgba(theme.fg, 0.06);
  ctx.fill();
  ctx.strokeStyle = rgba(theme.fg, 0.10);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Header / count
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = rgba(theme.fg, 0.78);
  ctx.font = "600 28px 'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif";
  const count = (opts.countLabel ?? "").trim();
  if (count) ctx.fillText(count, cardX + cardW - 52, cardY + 74);
  ctx.restore();

  // Dhikr text
  const text = (opts.text ?? "").trim();
  const fontSize = fontSizeByLength(text.length);
  const lineHeight = Math.round(fontSize * 1.55);

  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = theme.fg;
  ctx.font = `700 ${fontSize}px 'Noto Naskh Arabic','Noto Sans Arabic','Segoe UI',Tahoma,Arial,sans-serif`;

  const textX = cardX + cardW - 52;
  const textTop = cardY + 140;
  const maxWidth = cardW - 104;

  const paragraphs = text.split("\n");
  const allLines: string[] = [];
  for (const p of paragraphs) {
    const lines = wrapRtlText(ctx, p, maxWidth);
    if (allLines.length) allLines.push("");
    allLines.push(...lines);
  }

  let y = textTop;
  const maxY = cardY + cardH - 140;
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
  const footer = (opts.footer ?? "ATHAR • أثر").trim();
  ctx.save();
  roundRect(ctx, cardX, cardY + cardH + 42, cardW, 96, 42);
  ctx.fillStyle = rgba(theme.fg, 0.05);
  ctx.fill();
  ctx.strokeStyle = rgba(theme.fg, 0.10);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.fillStyle = rgba(theme.fg, 0.88);
  ctx.font = "700 30px 'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif";
  ctx.fillText(footer, cardX + cardW - 52, cardY + cardH + 104);

  ctx.textAlign = "left";
  ctx.fillStyle = rgba(theme.fg, 0.55);
  ctx.font = "600 22px 'Noto Sans Arabic','Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif";
  ctx.fillText("xgharibx.github.io/ATHAR", cardX + 52, cardY + cardH + 104);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });

  return blob;
}
