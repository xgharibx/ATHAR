/**
 * The plants of «الحديقة الحيّة», painted once each in full detail and then
 * only moved (swayed, grown, opened) frame by frame by GardenEngine.
 *
 *   date palm   a curved trunk with the criss-cross leaf bases of a real date
 *               palm; pinnate fronds of tapered leaflets, darker at the base;
 *               hanging bunches of dates
 *   cypress     hundreds of foliage tufts, lit from one side, leafy at the edge
 *   pomegranate tapered branches with bark, leaf clusters, five-petal blossoms
 *               and fruit with its crown
 *   flowers     each kind at ten stages from bud to full bloom: roses in
 *               layered petals, tulips, daisies, lavender, poppies, jasmine
 *
 * Light comes from the upper left (the sun, or the Moon at night); every
 * painter takes the mode so night versions are moonlit, not just darker.
 */
import { seededRandom } from "@/components/ufuq/garden/gardenMath";

export type SpriteMode = "day" | "night";

export type Sprite = { canvas: HTMLCanvasElement; w: number; h: number; ax: number; ay: number };

function sprite(w: number, h: number, dpr: number, ax: number, ay: number, paint: (g: CanvasRenderingContext2D) => void): Sprite | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * dpr));
  canvas.height = Math.max(1, Math.ceil(h * dpr));
  const g = canvas.getContext("2d");
  if (!g) return null;
  g.scale(dpr, dpr);
  g.lineCap = "round";
  g.lineJoin = "round";
  paint(g);
  return { canvas, w, h, ax, ay };
}

/**
 * Flatten several sprites that share one anchor into a single image, cut to
 * what is actually painted, so it costs one small draw a frame instead of
 * several large ones.
 */
export function composeSprites(layers: Array<Sprite | null>, dpr: number): Sprite | null {
  const first = layers.find((l): l is Sprite => Boolean(l));
  if (!first) return null;
  const full = document.createElement("canvas");
  full.width = first.canvas.width;
  full.height = first.canvas.height;
  const g = full.getContext("2d", { willReadFrequently: true });
  if (!g) return first;
  for (const l of layers) if (l) g.drawImage(l.canvas, 0, 0);
  let x0 = full.width;
  let y0 = full.height;
  let x1 = 0;
  let y1 = 0;
  try {
    const px = g.getImageData(0, 0, full.width, full.height).data;
    for (let y = 0; y < full.height; y++) {
      for (let x = 0; x < full.width; x++) {
        if (px[(y * full.width + x) * 4 + 3]! > 2) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  } catch {
    return { canvas: full, w: first.w, h: first.h, ax: first.ax, ay: first.ay };
  }
  if (x1 < x0 || y1 < y0) return null;
  const cut = document.createElement("canvas");
  cut.width = x1 - x0 + 1;
  cut.height = y1 - y0 + 1;
  cut.getContext("2d")?.drawImage(full, -x0, -y0);
  return { canvas: cut, w: cut.width / dpr, h: cut.height / dpr, ax: first.ax - x0 / dpr, ay: first.ay - y0 / dpr };
}

/** Mix two #rrggbb colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const p = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const k = Math.max(0, Math.min(1, t));
  const ch = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * k).toString(16).padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

type Foliage = { dark: string; mid: string; light: string; rim: string };

export const FOLIAGE: Record<SpriteMode, Foliage> = {
  day: { dark: "#1f4a24", mid: "#3c7a35", light: "#8cbf55", rim: "#d8f0a0" },
  night: { dark: "#06120c", mid: "#10281c", light: "#23463a", rim: "#7f9fc0" },
};

// ───────────────────────── Date palm ─────────────────────────

/** One frond, drawn from its base at (0, h·0.25) out to the right, drooping. */
export function paintFrond(len: number, mode: SpriteMode, dpr: number, seed: number, shade = 0): Sprite | null {
  const h = len * 0.62;
  const rnd = seededRandom(seed);
  const f = FOLIAGE[mode];
  const dark = mix(f.dark, "#000000", shade * 0.5);
  const mid = mix(f.mid, f.dark, shade);
  const tip = mix(f.light, f.mid, shade * 0.8);
  return sprite(len + 8, h, dpr, 4, h * 0.25, (g) => {
    g.translate(4, 0);
    const p0 = { x: 0, y: h * 0.25 };
    const droop = 0.42 + rnd() * 0.18;
    const p1 = { x: len * 0.5, y: h * 0.08 };
    const p2 = { x: len, y: h * droop + h * 0.2 };
    const at = (t: number) => ({
      x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
      y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
    });
    const tangent = (t: number) => Math.atan2(
      2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
      2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    );
    // Leaflets: pairs along the rachis, longest in the middle, angled forward.
    const pairs = 46;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 2; i < pairs; i++) {
        const t = i / pairs;
        const p = at(t);
        const a = tangent(t);
        const L = len * 0.24 * Math.pow(Math.sin(Math.PI * Math.min(0.98, t * 0.92 + 0.06)), 0.65) * (0.85 + rnd() * 0.3);
        const spread = (0.95 - t * 0.45) * side + (rnd() - 0.5) * 0.12;
        // Upper leaflets catch the light; lower ones hang in shade.
        const lit = side < 0 ? 1 : 0.55;
        const ang = a + spread + (side > 0 ? 0.25 : 0) * t;
        const tx = p.x + Math.cos(ang) * L;
        const ty = p.y + Math.sin(ang) * L + L * 0.18;
        const nx = Math.cos(ang + Math.PI / 2);
        const ny = Math.sin(ang + Math.PI / 2);
        const wB = len * 0.011 * (1 - t * 0.5);
        const grad = g.createLinearGradient(p.x, p.y, tx, ty);
        grad.addColorStop(0, dark);
        grad.addColorStop(0.45, mix(mid, tip, 0.25 * lit));
        grad.addColorStop(1, mix(tip, mid, 1 - lit));
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(p.x + nx * wB, p.y + ny * wB);
        g.quadraticCurveTo((p.x + tx) / 2 + nx * wB * 1.6, (p.y + ty) / 2 + ny * wB * 1.6 + L * 0.06, tx, ty);
        g.quadraticCurveTo((p.x + tx) / 2 - nx * wB * 0.4, (p.y + ty) / 2 - ny * wB * 0.4 + L * 0.06, p.x - nx * wB, p.y - ny * wB);
        g.closePath();
        g.fill();
        // A midrib catches the light on the upper leaflets.
        if (side < 0 && i % 2 === 0) {
          g.strokeStyle = mode === "night" ? "rgba(140,170,210,0.18)" : "rgba(230,250,190,0.22)";
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x + (tx - p.x) * 0.8, p.y + (ty - p.y) * 0.8);
          g.stroke();
        }
      }
    }
    // The rachis: thick at the base, tapering out.
    for (let i = 0; i < 24; i++) {
      const t0 = i / 24;
      const t1 = (i + 1) / 24;
      const a = at(t0);
      const b = at(t1);
      g.strokeStyle = mix(mode === "night" ? "#141a14" : "#5e6a30", dark, 0.25 + t0 * 0.6);
      g.lineWidth = Math.max(0.5, len * 0.014 * (1 - t0 * 0.85));
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
  });
}

/** The trunk of a date palm: curved, tapering, with its criss-cross leaf bases. */
export function paintPalmTrunk(height: number, lean: number, mode: SpriteMode, dpr: number): Sprite | null {
  const w = height * 0.32;
  const night = mode === "night";
  return sprite(w, height + 10, dpr, w * 0.3, height + 6, (g) => {
    const baseX = w * 0.3;
    const topX = baseX + lean * height;
    const ctrlX = baseX + lean * height * 0.15;
    const at = (t: number) => ({
      x: (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * ctrlX + t * t * topX,
      y: height + 6 - t * height,
    });
    // Wider where it roots, as a real palm is.
    const width = (t: number) => height * (0.068 - t * 0.026 + 0.03 * Math.exp(-t * 22));
    // Silhouette path.
    const left: Array<{ x: number; y: number }> = [];
    const right: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const p = at(t);
      const ww = width(t) * (1 + Math.sin(t * 60) * 0.03);
      left.push({ x: p.x - ww / 2, y: p.y });
      right.push({ x: p.x + ww / 2, y: p.y });
    }
    g.beginPath();
    for (const p of left) g.lineTo(p.x, p.y);
    for (const p of [...right].reverse()) g.lineTo(p.x, p.y);
    g.closePath();
    // Lit on the left, in shade on the right.
    const body = g.createLinearGradient(baseX - width(0.3) / 2, 0, baseX + width(0.3) / 2, 0);
    body.addColorStop(0, night ? "#3a3c44" : "#b3946a");
    body.addColorStop(0.35, night ? "#24262c" : "#8a6c48");
    body.addColorStop(1, night ? "#0b0c10" : "#4a3624");
    g.fillStyle = body;
    g.fill();
    g.save();
    g.clip();
    // Leaf bases: rows of overlapping chevrons, alternating.
    const rnd = seededRandom(11);
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const p = at(t);
      const ww = width(t);
      const row = ww * 0.42;
      for (let k = -2; k <= 2; k++) {
        const cx = p.x + (k + (i % 2) * 0.5) * row;
        const lightness = 0.5 - (cx - p.x) / ww; // left lit
        g.fillStyle = night
          ? `rgba(${120 + lightness * 50},${125 + lightness * 50},${140 + lightness * 50},${0.1 + rnd() * 0.08})`
          : `rgba(${210 + lightness * 30},${170 + lightness * 30},${110 + lightness * 20},${0.16 + rnd() * 0.1})`;
        g.beginPath();
        g.moveTo(cx - row * 0.55, p.y);
        g.lineTo(cx, p.y - row * 0.7);
        g.lineTo(cx + row * 0.55, p.y);
        g.lineTo(cx, p.y - row * 0.25);
        g.closePath();
        g.fill();
        g.strokeStyle = night ? "rgba(0,0,0,0.45)" : "rgba(50,30,15,0.38)";
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(cx - row * 0.55, p.y);
        g.lineTo(cx, p.y - row * 0.25);
        g.lineTo(cx + row * 0.55, p.y);
        g.stroke();
      }
    }
    g.restore();
    // Moonlight or sunlight along the lit edge.
    g.strokeStyle = night ? "rgba(150,175,215,0.35)" : "rgba(255,235,190,0.3)";
    g.lineWidth = 1.2;
    g.beginPath();
    left.forEach((p, i) => (i ? g.lineTo(p.x + 0.8, p.y) : g.moveTo(p.x + 0.8, p.y)));
    g.stroke();
  });
}

/** A bunch of dates hanging under the crown. */
export function paintDates(size: number, mode: SpriteMode, dpr: number, seed: number): Sprite | null {
  const rnd = seededRandom(seed);
  const night = mode === "night";
  return sprite(size, size * 1.3, dpr, size / 2, 2, (g) => {
    // Strands.
    g.strokeStyle = night ? "#3a2c18" : "#c99a3a";
    g.lineWidth = 0.9;
    const tips: Array<[number, number]> = [];
    for (let i = 0; i < 9; i++) {
      const x1 = size / 2 + (rnd() - 0.5) * size * 0.8;
      const y1 = size * (0.55 + rnd() * 0.65);
      g.beginPath();
      g.moveTo(size / 2, 2);
      g.quadraticCurveTo(size / 2 + (x1 - size / 2) * 0.3, y1 * 0.45, x1, y1);
      g.stroke();
      tips.push([x1, y1]);
    }
    // Dates along the strands, each with light on its upper left.
    for (const [tx, ty] of tips) {
      for (let k = 0; k < 7; k++) {
        const s = 0.35 + k * 0.1;
        const x = size / 2 + (tx - size / 2) * s + (rnd() - 0.5) * 3;
        const y = 2 + (ty - 2) * s + (rnd() - 0.5) * 3;
        const rx = size * 0.045;
        const ry = size * 0.07;
        const grad = g.createRadialGradient(x - rx * 0.4, y - ry * 0.4, 0.5, x, y, ry);
        if (night) {
          grad.addColorStop(0, "#5a3a20");
          grad.addColorStop(1, "#1e1208");
        } else {
          grad.addColorStop(0, "#f2a24a");
          grad.addColorStop(0.55, "#c4621e");
          grad.addColorStop(1, "#6e2a0c");
        }
        g.fillStyle = grad;
        g.beginPath();
        g.ellipse(x, y, rx, ry, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

// ───────────────────────── Cypress ─────────────────────────

export function paintCypress(width: number, height: number, mode: SpriteMode, dpr: number, seed: number): Sprite | null {
  const rnd = seededRandom(seed);
  const f = FOLIAGE[mode];
  const W = width * 1.3;
  return sprite(W, height + 8, dpr, W / 2, height + 4, (g) => {
    const cx = W / 2;
    const profile = (t: number) => Math.sin(Math.pow(t, 0.62) * Math.PI) * (width / 2) * (1 - t * 0.15); // t: 0 base → 1 tip
    // The dark core.
    g.fillStyle = mix(f.dark, "#000000", 0.25);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      g.lineTo(cx - profile(t) * 0.92, height + 4 - t * height);
    }
    for (let i = 40; i >= 0; i--) {
      const t = i / 40;
      g.lineTo(cx + profile(t) * 0.92, height + 4 - t * height);
    }
    g.fill();
    // Foliage tufts, more of them toward the lit side and the edge.
    const tufts = Math.round(height * 3.2);
    for (let i = 0; i < tufts; i++) {
      const t = Math.pow(rnd(), 0.9);
      const half = profile(t);
      const u = rnd() * 2 - 1; // −1 left edge … 1 right edge
      const x = cx + u * half * (0.95 + rnd() * 0.15);
      const y = height + 4 - t * height + (rnd() - 0.5) * 4;
      const light = Math.max(0, Math.min(1, 0.55 - u * 0.45 + (rnd() - 0.5) * 0.35)) * (0.6 + t * 0.4);
      g.fillStyle = mix(f.dark, light > 0.75 ? f.light : f.mid, light);
      const rx = 1.6 + rnd() * 2.4;
      const ry = rx * (1.8 + rnd());
      g.beginPath();
      g.ellipse(x, y, rx, ry, (rnd() - 0.5) * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    // Rim light on the lit edge.
    g.strokeStyle = mode === "night" ? "rgba(140,170,215,0.22)" : "rgba(220,245,170,0.25)";
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 4; i <= 38; i++) {
      const t = i / 40;
      g.lineTo(cx - profile(t) * 0.97, height + 4 - t * height);
    }
    g.stroke();
  });
}

// ───────────────────────── Pomegranate tree ─────────────────────────

type TreeLayers = { wood: Sprite | null; leaves: Sprite | null; blossom: Sprite | null; fruit: Sprite | null };

export function paintPomegranate(height: number, mode: SpriteMode, dpr: number, seed: number): TreeLayers {
  const rnd = seededRandom(seed);
  const f = FOLIAGE[mode];
  const night = mode === "night";
  // Room for the whole crown: it can reach above `height` and out to the sides.
  const W = height * 1.7;
  const H = height * 1.45;
  const baseX = W / 2;
  const baseY = H - 4;
  type Seg = { x1: number; y1: number; x2: number; y2: number; w: number; depth: number };
  const segs: Seg[] = [];
  const tips: Array<[number, number]> = [];
  const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
    const x2 = x + Math.sin(ang) * len;
    const y2 = y - Math.cos(ang) * len;
    segs.push({ x1: x, y1: y, x2, y2, w, depth });
    if (depth >= 6) {
      tips.push([x2, y2]);
      return;
    }
    const n = depth < 2 ? 2 : rnd() > 0.4 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * (0.5 + rnd() * 0.22) + (rnd() - 0.5) * 0.28;
      // Branches turn back toward the sky, so the crown is round, not flat.
      const lift = -ang * 0.12;
      grow(x2, y2, ang + spread * (depth === 0 ? 0.75 : 0.85) + lift, len * (0.72 + rnd() * 0.12), w * 0.66, depth + 1);
    }
  };
  grow(baseX, baseY, -0.04, height * 0.24, height * 0.06, 0);
  const ends = tips.length;
  // Leaves grow along the outer branches too, not only at their ends, so the
  // crown is full and round.
  for (const sg of segs) {
    if (sg.depth < 3) continue;
    tips.push([(sg.x1 + sg.x2) / 2 + (rnd() - 0.5) * height * 0.04, (sg.y1 + sg.y2) / 2 + (rnd() - 0.5) * height * 0.04]);
  }

  const wood = sprite(W, H, dpr, baseX, baseY, (g) => {
    const bend = seededRandom(seed + 1);
    for (const s of segs) {
      const grad = g.createLinearGradient(s.x1 - s.w, s.y1, s.x1 + s.w, s.y1);
      grad.addColorStop(0, night ? "#2c2a30" : "#8a6a52");
      grad.addColorStop(1, night ? "#0c0b0e" : "#3e2a1e");
      g.strokeStyle = grad;
      g.lineWidth = s.w;
      const mx = (s.x1 + s.x2) / 2 + (bend() - 0.5) * s.w * 2.2;
      const my = (s.y1 + s.y2) / 2 + (bend() - 0.5) * s.w;
      g.beginPath();
      g.moveTo(s.x1, s.y1);
      g.quadraticCurveTo(mx, my, s.x2, s.y2);
      g.stroke();
      // Bark catches the light on its left side.
      if (s.w > 2.5) {
        g.strokeStyle = night ? "rgba(140,160,200,0.18)" : "rgba(220,190,150,0.35)";
        g.lineWidth = Math.max(0.6, s.w * 0.18);
        g.beginPath();
        g.moveTo(s.x1 - s.w * 0.3, s.y1);
        g.quadraticCurveTo(mx - s.w * 0.3, my, s.x2 - s.w * 0.3, s.y2);
        g.stroke();
      }
    }
  });

  const leafShape = (g: CanvasRenderingContext2D, x: number, y: number, a: number, L: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(L * 0.5, -L * 0.28, L, 0);
    g.quadraticCurveTo(L * 0.5, L * 0.28, 0, 0);
    g.fill();
    g.restore();
  };

  const leaves = sprite(W, H, dpr, baseX, baseY, (g) => {
    // The shade inside the crown, so it reads as a mass and not a sieve.
    for (const [tx, ty] of tips) {
      const r = height * 0.06;
      const sg = g.createRadialGradient(tx + r * 0.2, ty + r * 0.25, 1, tx, ty, r);
      const core = mix(f.dark, "#000000", 0.3);
      sg.addColorStop(0, core);
      sg.addColorStop(0.7, `${core}aa`);
      sg.addColorStop(1, `${core}00`);
      g.fillStyle = sg;
      g.fillRect(tx - r, ty - r, r * 2, r * 2);
    }
    // Leaves: the deep ones first, the sunlit outer ones last.
    const all: Array<[number, number, number]> = [];
    for (const [tx, ty] of tips) {
      for (let k = 0; k < 22; k++) {
        const r = height * 0.1 * Math.sqrt(rnd());
        const a = rnd() * Math.PI * 2;
        const x = tx + Math.cos(a) * r;
        const y = ty + Math.sin(a) * r * 0.8;
        const light = Math.max(0, Math.min(1, 0.5 - (x - baseX) / W * 0.9 + (baseY - y) / H * 0.45 + (rnd() - 0.5) * 0.45));
        all.push([x, y, light]);
      }
    }
    all.sort((a, b) => a[2] - b[2]);
    for (const [x, y, light] of all) {
      // Glossy, deep leaves: only the very top of the crown turns light.
      const top = light > 0.85 ? mix(f.mid, f.light, 0.55) : f.mid;
      g.fillStyle = mix(mix(f.dark, "#000000", 0.2), top, Math.pow(light, 0.8));
      leafShape(g, x, y, rnd() * Math.PI * 2, height * (0.03 + rnd() * 0.018));
    }
  });

  const blossom = sprite(W, H, dpr, baseX, baseY, (g) => {
    tips.forEach(([tx, ty], i) => {
      if (i % 5) return;
      for (let k = 0; k < 1; k++) {
        const x = tx + (rnd() - 0.5) * height * 0.14;
        const y = ty + (rnd() - 0.5) * height * 0.1;
        const r = height * (0.008 + rnd() * 0.004);
        // Pomegranate blossom: scarlet, five crumpled petals around a calyx.
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2 + rnd() * 0.3;
          g.fillStyle = night ? mix("#3a1c24", "#4a2a34", rnd()) : mix("#d8361e", "#ff7448", rnd() * 0.6);
          g.beginPath();
          g.ellipse(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.85, r * 0.6, a, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = night ? "#3a2418" : "#f6c060";
        g.beginPath();
        g.arc(x, y, r * 0.35, 0, Math.PI * 2);
        g.fill();
      }
    });
  });

  const fruit = sprite(W, H, dpr, baseX, baseY, (g) => {
    tips.slice(0, ends).forEach(([tx, ty], i) => {
      if (i % 7) return;
      const x = tx + (rnd() - 0.5) * height * 0.06;
      const y = ty + height * 0.05;
      const r = height * (0.019 + rnd() * 0.006);
      const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
      if (night) {
        grad.addColorStop(0, "#5a2a30");
        grad.addColorStop(1, "#1a0a0e");
      } else {
        grad.addColorStop(0, "#ff9a7a");
        grad.addColorStop(0.35, "#d8392e");
        grad.addColorStop(1, "#6e1416");
      }
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      // The crown (calyx) on top.
      g.fillStyle = night ? "#2a1a14" : "#8a2a1e";
      for (let c = 0; c < 5; c++) {
        const a = -Math.PI / 2 + (c - 2) * 0.32;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r * 0.25, y - r * 0.85);
        g.lineTo(x + Math.cos(a) * r * 0.42, y - r * 1.28);
        g.lineTo(x + Math.cos(a) * r * 0.05, y - r * 0.95);
        g.fill();
      }
    });
  });

  return { wood, leaves, blossom, fruit };
}

// ───────────────────────── Flowers ─────────────────────────

export type FlowerKind = "rose" | "tulip" | "daisy" | "lavender" | "poppy" | "jasmine";
export const FLOWER_STAGES = 10;

const FLOWER_COLORS: Record<FlowerKind, Array<[string, string, string]>> = {
  // [deep, mid, edge]
  rose: [["#6e0a1c", "#c8243f", "#ff7a8c"], ["#7a2048", "#e0508a", "#ffb0cc"], ["#8a5a10", "#f0c040", "#fff0a0"], ["#7a7a70", "#f4efe4", "#ffffff"]],
  tulip: [["#7a0e1a", "#e2455c", "#ffa0a8"], ["#8a3a08", "#f07a28", "#ffd090"], ["#8a6a08", "#f6c945", "#fff3b0"], ["#5a1050", "#b04ac0", "#f0b0ff"]],
  daisy: [["#9aa0b0", "#f4f4f8", "#ffffff"]],
  lavender: [["#3a2a70", "#7a5ad0", "#c6b0ff"]],
  poppy: [["#5a0808", "#e5402f", "#ff9a70"]],
  jasmine: [["#b0b0c0", "#ffffff", "#ffffff"]],
};

export function flowerVariants(kind: FlowerKind): number {
  return FLOWER_COLORS[kind].length;
}

/**
 * One flower head at one stage of opening (0 bud … 1 full bloom), seen a
 * little from above. Size is the bloom's full diameter.
 */
export function paintFlowerHead(kind: FlowerKind, variant: number, stage: number, size: number, mode: SpriteMode, dpr: number): Sprite | null {
  const [deep0, mid0, edge0] = FLOWER_COLORS[kind][variant % FLOWER_COLORS[kind].length]!;
  const night = mode === "night";
  // Moonlight drains colour and light, but keeps the flower's own hue.
  const deep = night ? mix(deep0, "#0a1020", 0.55) : deep0;
  const mid = night ? mix(mid0, "#1a2440", 0.55) : mid0;
  const edge = night ? mix(edge0, "#5a6a90", 0.45) : edge0;
  const S = size * 1.4;
  const s = Math.max(0, Math.min(1, stage));
  return sprite(S, S, dpr, S / 2, S * 0.62, (g) => {
    const cx = S / 2;
    const cy = S * 0.5;
    const R = size / 2;
    g.save();
    g.translate(cx, cy);
    switch (kind) {
      case "rose": {
        if (s < 0.28) {
          // A bud: a tight teardrop of petals inside its sepals.
          const b = 0.55 + s * 1.2;
          const grad = g.createLinearGradient(-R * 0.3, -R * 0.6, R * 0.3, R * 0.4);
          grad.addColorStop(0, edge);
          grad.addColorStop(0.5, mid);
          grad.addColorStop(1, deep);
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo(0, -R * 0.75 * b);
          g.bezierCurveTo(R * 0.42 * b, -R * 0.45 * b, R * 0.38 * b, R * 0.3 * b, 0, R * 0.38 * b);
          g.bezierCurveTo(-R * 0.38 * b, R * 0.3 * b, -R * 0.42 * b, -R * 0.45 * b, 0, -R * 0.75 * b);
          g.fill();
          // Green sepals hugging the bud, beginning to part as it swells.
          g.fillStyle = night ? "#10281c" : "#3c7a35";
          for (const side of [-1, 0, 1]) {
            const lean = side * (0.35 + s * 0.9);
            g.save();
            g.translate(0, R * 0.32 * b);
            g.rotate(lean);
            g.beginPath();
            g.moveTo(-R * 0.1 * b, 0);
            g.quadraticCurveTo(-R * 0.08 * b, -R * 0.5 * b, 0, -R * (0.62 - Math.abs(side) * 0.1) * b);
            g.quadraticCurveTo(R * 0.08 * b, -R * 0.5 * b, R * 0.1 * b, 0);
            g.fill();
            g.restore();
          }
        } else {
          const open = (s - 0.28) / 0.72;
          g.scale(1, 0.82); // seen a little from above
          // Outer petals, back to front, opening outward.
          const outer = 5 + Math.round(open * 3);
          for (let i = 0; i < outer; i++) {
            const a = (i / outer) * Math.PI * 2 + 0.4;
            const r = R * (0.45 + open * 0.55);
            const px = Math.cos(a) * r * 0.42;
            const py = Math.sin(a) * r * 0.42;
            const grad = g.createRadialGradient(px * 0.2, py * 0.2, r * 0.05, px, py, r * 0.75);
            grad.addColorStop(0, deep);
            grad.addColorStop(0.55, mid);
            grad.addColorStop(1, edge);
            g.fillStyle = grad;
            g.beginPath();
            g.ellipse(px, py, r * 0.62, r * 0.5, a, 0, Math.PI * 2);
            g.fill();
            // The rolled-back edge catches the light.
            g.strokeStyle = night ? "rgba(170,190,230,0.25)" : "rgba(255,240,240,0.45)";
            g.lineWidth = Math.max(0.6, R * 0.035);
            g.beginPath();
            g.ellipse(px, py, r * 0.6, r * 0.48, a, a - 1.2, a + 0.3);
            g.stroke();
          }
          // The heart: a tight spiral of inner petals.
          const turns = 3;
          for (let k = 0; k < turns * 6; k++) {
            const t = k / (turns * 6);
            const a = t * Math.PI * 2 * turns;
            const rr = R * (0.38 - t * 0.32) * (0.75 + open * 0.25);
            g.strokeStyle = mix(deep, mid, t * 0.6);
            g.lineWidth = Math.max(0.8, R * 0.09 * (1 - t * 0.6));
            g.beginPath();
            g.arc(0, 0, rr, a, a + 1.4);
            g.stroke();
            if (k % 3 === 0) {
              g.strokeStyle = night ? "rgba(170,190,230,0.22)" : "rgba(255,230,235,0.35)";
              g.lineWidth = Math.max(0.5, R * 0.03);
              g.beginPath();
              g.arc(0, -R * 0.02, rr, a + 0.2, a + 0.9);
              g.stroke();
            }
          }
          // Shadow in the very centre.
          const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.18);
          core.addColorStop(0, "rgba(30,0,10,0.5)");
          core.addColorStop(1, "rgba(30,0,10,0)");
          g.fillStyle = core;
          g.beginPath();
          g.arc(0, 0, R * 0.18, 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
      case "tulip": {
        const open = s;
        const h = R * (0.75 + open * 0.35);
        const spread = 0.05 + open * 0.38;
        const petal = (dx: number, rot: number, light: number) => {
          g.save();
          g.translate(dx, 0);
          g.rotate(rot);
          const grad = g.createLinearGradient(0, -h, 0, h * 0.45);
          grad.addColorStop(0, mix(edge, mid, 1 - light));
          grad.addColorStop(0.55, mid);
          grad.addColorStop(1, deep);
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo(0, h * 0.45);
          g.bezierCurveTo(R * 0.55, h * 0.3, R * 0.5, -h * 0.6, 0, -h);
          g.bezierCurveTo(-R * 0.5, -h * 0.6, -R * 0.55, h * 0.3, 0, h * 0.45);
          g.fill();
          // The light stripe down a tulip petal.
          g.strokeStyle = night ? "rgba(170,190,230,0.2)" : "rgba(255,255,255,0.32)";
          g.lineWidth = Math.max(0.6, R * 0.07);
          g.beginPath();
          g.moveTo(-R * 0.12, -h * 0.75);
          g.quadraticCurveTo(-R * 0.2, -h * 0.1, -R * 0.08, h * 0.3);
          g.stroke();
          g.restore();
        };
        petal(-R * 0.28, -spread, 0.3);
        petal(R * 0.28, spread, 0.6);
        petal(0, 0, 1);
        break;
      }
      case "daisy": {
        const open = s;
        g.scale(1, 0.62);
        const n = 22;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const L = R * (0.25 + open * 0.75);
          g.save();
          g.rotate(a);
          const grad = g.createLinearGradient(0, 0, L, 0);
          grad.addColorStop(0, mix(deep, mid, 0.5));
          grad.addColorStop(0.4, mid);
          grad.addColorStop(1, edge);
          g.fillStyle = grad;
          g.beginPath();
          g.ellipse(L * 0.55, 0, L * 0.5, R * 0.085, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }
        const disk = R * 0.26;
        const dg = g.createRadialGradient(-disk * 0.3, -disk * 0.3, 1, 0, 0, disk);
        dg.addColorStop(0, night ? "#6a6030" : "#ffd84a");
        dg.addColorStop(1, night ? "#3a3010" : "#c88a10");
        g.fillStyle = dg;
        g.beginPath();
        g.arc(0, 0, disk, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = night ? "rgba(0,0,0,0.25)" : "rgba(120,60,0,0.35)";
        for (let k = 0; k < 40; k++) {
          const a = k * 2.399963;
          const rr = Math.sqrt(k / 40) * disk * 0.9;
          g.beginPath();
          g.arc(Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.4, disk * 0.06), 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
      case "lavender": {
        const n = Math.round(6 + s * 18);
        for (let i = 0; i < n; i++) {
          const t = i / 24;
          const y = R * 0.6 - t * R * 1.8;
          const side = i % 2 ? 1 : -1;
          const rr = R * (0.13 - t * 0.05);
          const grad = g.createRadialGradient(side * rr * 0.5 - rr * 0.3, y - rr * 0.3, 0.3, side * rr * 0.5, y, rr);
          grad.addColorStop(0, edge);
          grad.addColorStop(1, deep);
          g.fillStyle = grad;
          g.beginPath();
          g.ellipse(side * rr * 0.55, y, rr, rr * 1.25, side * 0.4, 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
      case "poppy": {
        const open = s;
        g.scale(1, 0.85);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.6;
          const r = R * (0.3 + open * 0.62);
          const px = Math.cos(a) * r * 0.5;
          const py = Math.sin(a) * r * 0.5;
          const grad = g.createRadialGradient(0, 0, r * 0.05, px, py, r);
          grad.addColorStop(0, "#1a0606");
          grad.addColorStop(0.18, deep);
          grad.addColorStop(0.6, mid);
          grad.addColorStop(1, edge);
          g.globalAlpha = 0.92;
          g.fillStyle = grad;
          g.beginPath();
          // A crinkled edge.
          for (let k = 0; k <= 16; k++) {
            const t = (k / 16) * Math.PI * 2;
            const wob = 1 + Math.sin(t * 5 + i) * 0.05;
            const x = px + Math.cos(t) * r * 0.58 * wob;
            const y = py + Math.sin(t) * r * 0.5 * wob;
            if (k) g.lineTo(x, y);
            else g.moveTo(x, y);
          }
          g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = night ? "#20281a" : "#3a4a2a";
        g.beginPath();
        g.arc(0, 0, R * 0.14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = night ? "#2a2410" : "#2a1a10";
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          g.beginPath();
          g.arc(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22, Math.max(0.5, R * 0.03), 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
      case "jasmine": {
        const spots: Array<[number, number, number]> = [[0, 0, 1], [-0.42, 0.25, 0.8], [0.4, 0.3, 0.85], [0.05, -0.42, 0.7]];
        spots.forEach(([dx, dy, k], idx) => {
          const open = Math.max(0, Math.min(1, s * 1.3 - idx * 0.12));
          const x = dx * R;
          const y = dy * R;
          const r = R * 0.34 * k;
          if (open < 0.3) {
            g.fillStyle = night ? "#8a7a90" : "#f6c8d8";
            g.beginPath();
            g.ellipse(x, y, r * 0.22, r * 0.42, 0.3, 0, Math.PI * 2);
            g.fill();
            return;
          }
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
            const grad = g.createLinearGradient(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r);
            grad.addColorStop(0, night ? "#c8c8dc" : "#fff6e6");
            grad.addColorStop(1, night ? "#e8ecff" : "#ffffff");
            g.fillStyle = grad;
            g.beginPath();
            g.ellipse(x + Math.cos(a) * r * 0.5 * open, y + Math.sin(a) * r * 0.5 * open, r * 0.5 * open, r * 0.24, a, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = night ? "#9a8a50" : "#f2d060";
          g.beginPath();
          g.arc(x, y, r * 0.1, 0, Math.PI * 2);
          g.fill();
        });
        break;
      }
    }
    g.restore();
  });
}

/** A leaf for a flower's stem: serrated rose leaf or long blade. */
export function paintStemLeaf(len: number, mode: SpriteMode, dpr: number, blade: boolean): Sprite | null {
  const f = FOLIAGE[mode];
  const w = blade ? len * 0.22 : len * 0.5;
  return sprite(len + 4, w + 4, dpr, 2, (w + 4) / 2, (g) => {
    const cy = (w + 4) / 2;
    const grad = g.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, f.dark);
    grad.addColorStop(0.6, f.mid);
    grad.addColorStop(1, mix(f.mid, f.light, 0.5));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(2, cy);
    if (blade) {
      g.quadraticCurveTo(len * 0.5, cy - w * 0.5, len + 2, cy - w * 0.1);
      g.quadraticCurveTo(len * 0.5, cy + w * 0.2, 2, cy);
    } else {
      // A rose leaf: oval with a serrated edge.
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = 2 + t * len;
        const y = cy - Math.sin(t * Math.PI) * w * 0.5 - (i % 2 ? 0 : w * 0.05);
        g.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const x = 2 + t * len;
        const y = cy + Math.sin(t * Math.PI) * w * 0.42 + (i % 2 ? 0 : w * 0.05);
        g.lineTo(x, y);
      }
    }
    g.fill();
    g.strokeStyle = mode === "night" ? "rgba(120,150,190,0.25)" : "rgba(200,240,160,0.4)";
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(2, cy);
    g.lineTo(len, cy - w * 0.05);
    g.stroke();
  });
}

/**
 * A cumulus cloud: many soft puffs heaped into a dome over a flat base, lit
 * from above and greyer underneath.
 */
export function paintCloud(width: number, dpr: number, seed: number): Sprite | null {
  const rnd = seededRandom(seed);
  const h = width * 0.5;
  return sprite(width, h, dpr, 0, 0, (g) => {
    const base = h * 0.78;
    const puffs: Array<{ x: number; y: number; r: number }> = [];
    const n = 34;
    for (let i = 0; i < n; i++) {
      const u = 0.08 + rnd() * 0.84;
      const dome = Math.sin(Math.PI * u) * (0.75 + rnd() * 0.25);
      const r = width * (0.035 + dome * 0.07 + rnd() * 0.03);
      const top = base - dome * h * 0.55;
      const y = top + rnd() * (base - top) * 0.6 + r * 0.3;
      puffs.push({ x: u * width, y: Math.min(base - r * 0.35, y), r });
    }
    puffs.sort((a, b) => b.y - a.y);
    for (const p of puffs) {
      const grad = g.createRadialGradient(p.x - p.r * 0.25, p.y - p.r * 0.45, p.r * 0.05, p.x, p.y, p.r);
      grad.addColorStop(0, "rgba(255,255,255,0.92)");
      grad.addColorStop(0.55, "rgba(246,249,253,0.62)");
      grad.addColorStop(0.85, "rgba(222,231,244,0.22)");
      grad.addColorStop(1, "rgba(210,222,240,0)");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    // A flat, greyer underside where the cloud is thickest.
    g.globalCompositeOperation = "source-atop";
    const under = g.createLinearGradient(0, base - h * 0.25, 0, base);
    under.addColorStop(0, "rgba(160,176,205,0)");
    under.addColorStop(1, "rgba(150,166,198,0.32)");
    g.fillStyle = under;
    g.fillRect(0, 0, width, h);
    g.globalCompositeOperation = "destination-out";
    const cut = g.createLinearGradient(0, base - 4, 0, base + 6);
    cut.addColorStop(0, "rgba(0,0,0,0)");
    cut.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = cut;
    g.fillRect(0, base - 4, width, h - base + 4);
  });
}
