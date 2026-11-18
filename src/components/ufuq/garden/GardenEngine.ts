/**
 * «الحديقة» — a living garden drawn behind every page of the «أفق» design.
 *
 * One canvas, back to front:
 *   sky (and the Milky Way) → moon in tonight's real phase, or sun and clouds
 *   → stars, shooting stars, birds → far hills with a distant mosque → near
 *   hills → a date palm, two cypresses and a blossoming tree, all in the wind
 *   → back grass → flowers that open and close with the light → front grass
 *   → fireflies at night, butterflies and drifting petals by day.
 *
 * Cost is kept low on purpose: the static layers are painted once into
 * off-screen canvases, grass is drawn in one path per colour, the loop runs
 * at 30 frames a second, pauses when the app is hidden, lowers its own
 * resolution on a slow phone, and draws a single still frame when motion is
 * reduced.
 */
import {
  bloomTarget as _bloomTarget,
  easeOutBack,
  moonIllumination,
  moonPhase,
  seededRandom,
  windAt,
} from "@/components/ufuq/garden/gardenMath";

export type GardenMode = "day" | "night";

export type GardenOptions = {
  mode: GardenMode;
  /** Flowers to show (see bloomTarget). */
  blooms: number;
  /** Dates hang in the palm (kept a streak). */
  palmFruit: boolean;
  /** Pomegranates on the tree (finished today's wird). */
  treeFruit: boolean;
  /** false → one still frame, no animation. */
  live: boolean;
};

export const bloomTarget = _bloomTarget;

type Blade = { x: number; h: number; w: number; lean: number; flex: number; ph: number; c: number };
type FlowerKind = "tulip" | "daisy" | "rose" | "poppy" | "lavender" | "jasmine";
type Flower = { x: number; y: number; stem: number; kind: FlowerKind; color: string; size: number; ph: number; born: number; tilt: number };
type Star = { x: number; y: number; r: number; a: number; tw: number; ph: number; tint: string };
type Firefly = { x: number; y: number; ph: number; sp: number; rx: number; ry: number };
type Butterfly = { x: number; y: number; ph: number; sp: number; color: string; dir: number };
type Petal = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; s: number; color: string };
type Branch = { depth: number; angle: number; len: number; children: Branch[] };
type Gust = { x: number; s: number; at: number };

type Palette = {
  sky: Array<[number, string]>;
  farHills: string;
  mosque: string;
  nearHills: string;
  ground: [string, string];
  grassBack: string[];
  grassFront: string[];
  cypress: [string, string];
  palmTrunk: string;
  palmFrond: string;
  branch: string;
  blossoms: string[];
  leaves: string;
  flowerDim: number;
};

const PALETTES: Record<GardenMode, Palette> = {
  day: {
    sky: [[0, "#5e97dc"], [0.34, "#9cc4ee"], [0.68, "#d6e8f8"], [1, "#f1f7fd"]],
    farHills: "rgba(32, 72, 140, 0.30)",
    mosque: "rgba(28, 62, 122, 0.34)",
    nearHills: "#7fae96",
    ground: ["#4d8f58", "#2f6a3c"],
    grassBack: ["#6fae7c", "#5d9f6d", "#7dba86"],
    grassFront: ["#3f8f4a", "#4fa358", "#2f7a3c", "#66b86a"],
    cypress: ["#2f6b45", "#1f5233"],
    palmTrunk: "#8a6b4a",
    palmFrond: "#3f8a4c",
    branch: "#6b4a3a",
    blossoms: ["#f7b6c8", "#fbd3de", "#ffffff", "#f39ab4"],
    leaves: "#5fa863",
    flowerDim: 1,
  },
  night: {
    sky: [[0, "#010207"], [0.48, "#040a1a"], [0.84, "#0b1630"], [1, "#14223f"]],
    farHills: "#0a1430",
    mosque: "#0b1633",
    nearHills: "#07141b",
    ground: ["#0a1d14", "#030a07"],
    grassBack: ["#0d241b", "#0b2017", "#10291f"],
    grassFront: ["#123423", "#174029", "#0e2a1c", "#1d4a30"],
    cypress: ["#0d2619", "#081a11"],
    palmTrunk: "#1f1913",
    palmFrond: "#10301f",
    branch: "#231a18",
    blossoms: ["#8d6c86", "#a3889d", "#c7c2d8", "#7a5a72"],
    leaves: "#143522",
    flowerDim: 0.72,
  },
};

const FLOWER_COLORS: Record<FlowerKind, string[]> = {
  tulip: ["#e2455c", "#f28cb1", "#f6c945", "#ef7f45"],
  daisy: ["#ffffff"],
  rose: ["#c8243f", "#e95b7d", "#f6a5b9"],
  poppy: ["#e5402f", "#f06a3b"],
  lavender: ["#8a6cd6", "#a58be0"],
  jasmine: ["#ffffff"],
};

const KINDS: FlowerKind[] = ["tulip", "daisy", "rose", "tulip", "poppy", "lavender", "jasmine", "daisy", "rose", "jasmine"];

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export class GardenEngine {
  /** Moving things, redrawn every frame. */
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  /** Sky, hills and the mosque, painted once; the compositor layers it for free. */
  private readonly bgCanvas: HTMLCanvasElement;
  private readonly bg: CanvasRenderingContext2D;
  private bgDpr = 1;
  private opts: GardenOptions;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private maxDpr = 1.5;
  private density = 1;
  private groundY = 0;
  private groundH = 0;

  private painted = false;
  private cypressSprite: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private clouds: Array<{ img: HTMLCanvasElement; x: number; y: number; sp: number }> = [];

  private stars: Star[] = [];
  private back: Blade[] = [];
  private mid: Blade[] = [];
  private front: Blade[] = [];
  private flowers: Flower[] = [];
  private fireflies: Firefly[] = [];
  private butterflies: Butterfly[] = [];
  private petals: Petal[] = [];
  private tree: Branch | null = null;
  private gusts: Gust[] = [];
  private shooting: { x: number; y: number; vx: number; vy: number; at: number } | null = null;
  private nextShootingAt = 0;
  private birds: { x: number; y: number; at: number } | null = null;
  private nextBirdsAt = 0;

  private raf = 0;
  private running = false;
  private lastFrame = 0;
  private slowFrames = 0;
  private scrollY = 0;
  private readonly startedAt = performance.now();

  constructor(
    bgCanvas: HTMLCanvasElement,
    bg: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    opts: GardenOptions,
  ) {
    this.bgCanvas = bgCanvas;
    this.bg = bg;
    this.canvas = canvas;
    this.ctx = ctx;
    this.opts = { ...opts };
  }

  /** null where canvas is unavailable (tests, very old WebViews). */
  static create(bgCanvas: HTMLCanvasElement, canvas: HTMLCanvasElement, opts: GardenOptions): GardenEngine | null {
    try {
      const bg = bgCanvas.getContext("2d", { alpha: false });
      const ctx = canvas.getContext("2d");
      return bg && ctx ? new GardenEngine(bgCanvas, bg, canvas, ctx, opts) : null;
    } catch {
      return null;
    }
  }

  private get now() {
    return (performance.now() - this.startedAt) / 1000;
  }

  resize(w: number, h: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    const device = globalThis.devicePixelRatio || 1;
    this.dpr = Math.min(this.maxDpr, device);
    this.bgDpr = Math.min(2, device);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.bgCanvas.width = Math.round(this.w * this.bgDpr);
    this.bgCanvas.height = Math.round(this.h * this.bgDpr);
    this.groundH = Math.min(200, Math.max(120, this.h * 0.2));
    this.groundY = this.h - this.groundH;
    this.build();
    if (!this.running) this.drawFrame(this.now);
  }

  setOptions(next: Partial<GardenOptions>) {
    const prev = this.opts;
    this.opts = { ...prev, ...next };
    if (next.mode && next.mode !== prev.mode) {
      this.paintStatic();
    }
    if (next.blooms !== undefined && next.blooms !== prev.blooms) {
      this.syncFlowers(next.blooms > prev.blooms);
    }
    if (next.live !== undefined && next.live !== prev.live) {
      if (next.live) this.start();
      else this.stop();
    }
    if (!this.running) this.drawFrame(this.now);
  }

  setScroll(y: number) {
    this.scrollY = y;
  }

  /** A finger or pointer moving through the garden makes a gust there. */
  poke(x: number, strength: number) {
    this.gusts.push({ x, s: Math.max(-1.6, Math.min(1.6, strength)), at: this.now });
    if (this.gusts.length > 5) this.gusts.shift();
  }

  start() {
    if (this.running || !this.opts.live) return;
    this.running = true;
    this.lastFrame = 0;
    const loop = (ts: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (ts - this.lastFrame < 32) return; // 30 frames a second is plenty for wind
      this.lastFrame = ts;
      const t0 = performance.now();
      this.drawFrame(this.now);
      this.adapt(performance.now() - t0);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.drawFrame(this.now);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.cypressSprite = this.glow = null;
  }

  /** Slow phone: first fewer pixels, then fewer blades. */
  private adapt(ms: number) {
    if (ms > 14) this.slowFrames += 1;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (this.slowFrames < 24) return;
    this.slowFrames = 0;
    if (this.maxDpr > 1) {
      this.maxDpr = 1;
      this.resize(this.w, this.h);
    } else if (this.density > 0.5) {
      this.density = Math.max(0.5, this.density - 0.25);
      this.build();
    }
  }

  // ───────────────────────── Building the garden ─────────────────────────

  private build() {
    const rnd = seededRandom(1447 + Math.round(this.w) * 7 + Math.round(this.h));
    const { w, h, groundY, groundH } = this;
    const scale = groundH / 110;

    // Stars only in the sky, thinner toward the horizon.
    const starCount = Math.min(240, Math.round((w * h) / 1100));
    this.stars = Array.from({ length: starCount }, () => {
      const y = Math.pow(rnd(), 1.6) * (groundY - 120);
      const tintRoll = rnd();
      return {
        x: rnd() * w,
        y,
        r: 0.35 + Math.pow(rnd(), 3) * 1.25,
        a: 0.35 + rnd() * 0.65,
        tw: 0.6 + rnd() * 2.4,
        ph: rnd() * Math.PI * 2,
        tint: tintRoll > 0.9 ? "#ffe3b0" : tintRoll > 0.8 ? "#cfe0ff" : "#ffffff",
      };
    });

    const blade = (base: number, minH: number, maxH: number, colors: number): Blade => ({
      x: rnd() * (w + 20) - 10,
      h: (minH + rnd() * (maxH - minH)) * scale,
      w: (2 + rnd() * 2.6) * Math.max(0.8, scale),
      lean: (rnd() - 0.5) * 0.5,
      flex: 0.7 + rnd() * 0.6,
      ph: rnd() * Math.PI * 2 + base,
      c: Math.floor(rnd() * colors),
    });
    const scale2 = Math.min(1, scale);
    const backCount = Math.round((w / 2.4) * this.density);
    const midCount = Math.round((w / 2.1) * this.density);
    const frontCount = Math.round((w / 2.2) * this.density);
    this.back = Array.from({ length: backCount }, () => blade(0, 10 / scale * scale2, 26 / scale * scale2 + 4, 3)).sort((a, b) => a.c - b.c);
    this.mid = Array.from({ length: midCount }, () => blade(2, 14, 34, 4)).sort((a, b) => a.c - b.c);
    this.front = Array.from({ length: frontCount }, () => blade(1, 22, 48, 4)).sort((a, b) => a.c - b.c);

    // The blossoming tree: a fixed shape, so it is the same tree every day.
    const grow = (depth: number, len: number): Branch => ({
      depth,
      angle: depth === 0 ? 0 : (rnd() - 0.5) * 0.9,
      len,
      children: depth >= 6 ? [] : Array.from({ length: depth < 2 ? 2 : rnd() > 0.35 ? 2 : 3 }, () => grow(depth + 1, len * (0.68 + rnd() * 0.12))),
    });
    this.tree = grow(0, Math.min(90, h * 0.085));

    this.fireflies = Array.from({ length: 22 }, () => ({
      x: rnd() * w,
      y: groundY - rnd() * h * 0.28,
      ph: rnd() * 100,
      sp: 0.15 + rnd() * 0.35,
      rx: 30 + rnd() * 70,
      ry: 12 + rnd() * 30,
    }));
    this.butterflies = Array.from({ length: 3 }, (_, i) => ({
      x: rnd() * w,
      y: groundY - 40 - rnd() * 120,
      ph: rnd() * 100,
      sp: 0.25 + rnd() * 0.3,
      color: ["#f0a23b", "#6aa6f2", "#f4d24a"][i]!,
      dir: rnd() > 0.5 ? 1 : -1,
    }));
    this.petals = Array.from({ length: 10 }, () => this.newPetal(rnd));

    this.flowers = [];
    this.syncFlowers(false, rnd);
    this.paintStatic();
  }

  private newPetal(rnd: () => number = Math.random): Petal {
    const tx = this.w * 0.78;
    return {
      x: tx + (rnd() - 0.5) * 120,
      y: this.groundY - this.h * 0.24 + rnd() * 40,
      vx: -6 - rnd() * 10,
      vy: 10 + rnd() * 14,
      rot: rnd() * Math.PI,
      vr: (rnd() - 0.5) * 2,
      s: 2.2 + rnd() * 2,
      color: PALETTES.day.blossoms[Math.floor(rnd() * 4)]!,
    };
  }

  /** Add (sprouting) or trim flowers to match today's bloom count. */
  private syncFlowers(sprout: boolean, rnd: () => number = seededRandom(2024 + this.flowers.length)) {
    const target = Math.max(0, Math.round(this.opts.blooms * Math.min(1.2, this.w / 390)));
    const { w, groundY, groundH } = this;
    const born = sprout ? this.now : -10;
    while (this.flowers.length < target) {
      const kind = KINDS[Math.floor(rnd() * KINDS.length)]!;
      const colors = FLOWER_COLORS[kind];
      const depth = rnd();
      this.flowers.push({
        x: 12 + rnd() * (w - 24),
        y: groundY + 6 + depth * groundH * 0.42,
        stem: (22 + rnd() * 30) * (0.75 + depth * 0.5) * (groundH / 110),
        kind,
        color: colors[Math.floor(rnd() * colors.length)]!,
        size: (1.05 + rnd() * 0.5) * (0.8 + depth * 0.45),
        ph: rnd() * Math.PI * 2,
        born,
        tilt: (rnd() - 0.5) * 0.3,
      });
    }
    if (this.flowers.length > target) this.flowers.length = target;
    this.flowers.sort((a, b) => a.y - b.y);
  }

  // ───────────────────────── Static layers (painted once) ─────────────────────────

  private paintStatic() {
    const { w, h, groundY } = this;
    if (!w || !h) return;
    this.moonSprite = null;
    const night = this.opts.mode === "night";
    const p = PALETTES[this.opts.mode];
    const dpr = this.dpr;

    // Sky
    const s = this.bg;
    s.setTransform(this.bgDpr, 0, 0, this.bgDpr, 0, 0);
    const grad = s.createLinearGradient(0, 0, 0, groundY);
    for (const [at, color] of p.sky) grad.addColorStop(at, color);
    s.fillStyle = grad;
    s.fillRect(0, 0, w, h);
    if (night) {
      // The Milky Way: a soft diagonal band of dust and faint light.
      const rnd = seededRandom(99);
      s.save();
      s.translate(w * 0.5, groundY * 0.42);
      s.rotate(-0.55);
      const band = s.createLinearGradient(0, -70, 0, 70);
      band.addColorStop(0, "rgba(120,140,200,0)");
      band.addColorStop(0.5, "rgba(150,165,220,0.10)");
      band.addColorStop(1, "rgba(120,140,200,0)");
      s.fillStyle = band;
      s.fillRect(-w, -70, w * 2, 140);
      for (let i = 0; i < 900; i++) {
        const x = (rnd() - 0.5) * w * 2;
        const y = (rnd() + rnd() + rnd() - 1.5) * 50;
        s.fillStyle = `rgba(220,228,255,${0.05 + rnd() * 0.22})`;
        s.fillRect(x, y, 0.8, 0.8);
      }
      s.restore();
      // A faint glow where the night meets the hills.
      const horizon = s.createRadialGradient(w * 0.6, groundY, 10, w * 0.6, groundY, w * 0.9);
      horizon.addColorStop(0, "rgba(70,90,150,0.22)");
      horizon.addColorStop(1, "rgba(70,90,150,0)");
      s.fillStyle = horizon;
      s.fillRect(0, 0, w, h);
    } else {
      // The sun just out of frame, warming one corner of the sky.
      const sun = s.createRadialGradient(w * 0.2, groundY * 0.18, 4, w * 0.2, groundY * 0.18, w * 0.75);
      sun.addColorStop(0, "rgba(255,244,214,0.95)");
      sun.addColorStop(0.08, "rgba(255,236,200,0.55)");
      sun.addColorStop(0.4, "rgba(255,236,200,0.12)");
      sun.addColorStop(1, "rgba(255,236,200,0)");
      s.fillStyle = sun;
      s.fillRect(0, 0, w, h);
    }

    // Hills, the distant mosque and the ground, on the same still layer.
    const g = s;
    const ridge = (base: number, amp: number, f1: number, f2: number, seed: number) => {
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 8) {
        const y = base - amp * (0.55 + 0.3 * Math.sin(x * f1 + seed) + 0.15 * Math.sin(x * f2 + seed * 2));
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.closePath();
    };
    ridge(groundY - 22, 70, 0.006, 0.019, 1.7);
    g.fillStyle = p.farHills;
    g.fill();
    this.paintMosque(g, w * 0.6, groundY - 62, Math.min(1.25, w / 360), p.mosque, night);
    ridge(groundY + 6, 36, 0.011, 0.031, 4.2);
    g.fillStyle = p.nearHills;
    g.fill();
    const ground = g.createLinearGradient(0, groundY, 0, h);
    ground.addColorStop(0, p.ground[0]);
    ground.addColorStop(1, p.ground[1]);
    g.fillStyle = ground;
    g.beginPath();
    g.moveTo(0, groundY + 10);
    for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, groundY + 6 + Math.sin(x * 0.02) * 4);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fill();
    this.painted = true;

    // A cypress, painted once and swayed as a whole.
    const cw = 46;
    const ch = Math.min(380, h * 0.44);
    const cy = makeCanvas(cw * dpr, ch * dpr);
    const c = cy.getContext("2d");
    if (c) {
      c.scale(dpr, dpr);
      const body = c.createLinearGradient(0, 0, cw, 0);
      body.addColorStop(0, p.cypress[1]);
      body.addColorStop(0.45, p.cypress[0]);
      body.addColorStop(1, p.cypress[1]);
      c.fillStyle = body;
      c.beginPath();
      c.moveTo(cw / 2, 0);
      c.bezierCurveTo(cw * 0.95, ch * 0.3, cw, ch * 0.75, cw * 0.62, ch);
      c.lineTo(cw * 0.38, ch);
      c.bezierCurveTo(0, ch * 0.75, cw * 0.05, ch * 0.3, cw / 2, 0);
      c.fill();
      c.strokeStyle = night ? "rgba(0,0,0,0.25)" : "rgba(10,40,20,0.22)";
      c.lineWidth = 1;
      const rnd = seededRandom(7);
      for (let i = 0; i < 26; i++) {
        const y = rnd() * ch * 0.95;
        const spread = Math.sin((y / ch) * Math.PI) * cw * 0.36;
        c.beginPath();
        c.moveTo(cw / 2 + (rnd() - 0.5) * spread, y);
        c.quadraticCurveTo(cw / 2, y + 10, cw / 2 + (rnd() - 0.5) * spread, y + 18);
        c.stroke();
      }
    }
    this.cypressSprite = cy;

    // One soft glow, reused by every firefly and jasmine at night.
    const glow = makeCanvas(48, 48);
    const gl = glow.getContext("2d");
    if (gl) {
      const rg = gl.createRadialGradient(24, 24, 0, 24, 24, 24);
      rg.addColorStop(0, "rgba(255,246,190,1)");
      rg.addColorStop(0.25, "rgba(230,255,160,0.55)");
      rg.addColorStop(1, "rgba(200,255,140,0)");
      gl.fillStyle = rg;
      gl.fillRect(0, 0, 48, 48);
    }
    this.glow = glow;

    // Day clouds: soft heaps of circles, painted once each.
    this.clouds = [];
    if (!night) {
      const rnd = seededRandom(31);
      for (let i = 0; i < 4; i++) {
        const cwid = 140 + rnd() * 110;
        const chei = 60;
        const img = makeCanvas(cwid * dpr, chei * dpr);
        const k = img.getContext("2d");
        if (!k) continue;
        k.scale(dpr, dpr);
        k.fillStyle = "rgba(255,255,255,0.75)";
        k.shadowColor = "rgba(255,255,255,0.9)";
        k.shadowBlur = 14;
        for (let j = 0; j < 7; j++) {
          const r = 12 + rnd() * 16;
          k.beginPath();
          k.arc(20 + rnd() * (cwid - 40), 32 + (rnd() - 0.5) * 12, r, 0, Math.PI * 2);
          k.fill();
        }
        this.clouds.push({ img, x: rnd() * w, y: 50 + rnd() * groundY * 0.4, sp: 3 + rnd() * 5 });
      }
    }
  }

  private paintMosque(g: CanvasRenderingContext2D, cx: number, base: number, k: number, color: string, night: boolean) {
    g.save();
    g.translate(cx, base);
    g.scale(k, k);
    g.fillStyle = color;
    // body
    g.fillRect(-34, -18, 68, 26);
    // dome
    g.beginPath();
    g.moveTo(-24, -18);
    g.bezierCurveTo(-26, -46, -4, -52, 0, -62);
    g.bezierCurveTo(4, -52, 26, -46, 24, -18);
    g.closePath();
    g.fill();
    g.fillRect(-0.8, -70, 1.6, 9);
    // minarets
    for (const mx of [-46, 46]) {
      g.fillRect(mx - 3.2, -64, 6.4, 72);
      g.fillRect(mx - 5, -44, 10, 3);
      g.beginPath();
      g.moveTo(mx - 3.6, -64);
      g.lineTo(mx, -76);
      g.lineTo(mx + 3.6, -64);
      g.fill();
    }
    if (night) {
      // Lamps still lit in the windows.
      g.fillStyle = "rgba(255,206,120,0.85)";
      for (const wx of [-22, -8, 6, 20]) g.fillRect(wx, -9, 2.4, 4);
      g.fillRect(-47, -34, 2, 3);
      g.fillRect(45, -34, 2, 3);
    }
    g.restore();
  }

  // ───────────────────────── One frame ─────────────────────────

  private gustAt(x: number, t: number): number {
    let sum = 0;
    for (const g of this.gusts) {
      const age = t - g.at;
      if (age > 2.5) continue;
      const dx = (x - g.x) / 80;
      sum += g.s * Math.exp(-dx * dx) * Math.exp(-age * 1.7);
    }
    return sum;
  }

  private drawFrame(t: number) {
    const { ctx, w, h, groundY } = this;
    if (!w || !h || !this.painted) return;
    const night = this.opts.mode === "night";
    const p = PALETTES[this.opts.mode];
    this.gusts = this.gusts.filter((g) => t - g.at < 2.5);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const lift = -Math.min(600, this.scrollY) * 0.05;
    if (night) {
      this.drawStars(t, lift);
      this.drawMoon(lift);
      this.drawShootingStar(t);
    } else {
      this.drawClouds(t);
      this.drawBirds(t);
    }

    this.drawCypresses(t);
    this.drawBlossomTree(t, p);
    this.drawPalm(t, p);

    this.drawGrass(this.back, p.grassBack, t, groundY + 4, 0.7);
    this.drawFlowers(t, night, p.flowerDim);
    this.drawGrass(this.mid, p.grassFront, t, groundY + this.groundH * 0.5, 0.85);
    this.drawGrass(this.front, p.grassFront, t, h + 2, 1);

    if (night) this.drawFireflies(t);
    else {
      this.drawPetals(t);
      this.drawButterflies(t);
    }
  }

  private drawStars(t: number, lift: number) {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const a = s.a * (0.65 + 0.35 * Math.sin(t * s.tw + s.ph));
      ctx.globalAlpha = a;
      ctx.fillStyle = s.tint;
      const size = s.r * 1.7;
      ctx.fillRect(s.x - size / 2, s.y + lift - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  private moonSprite: HTMLCanvasElement | null = null;
  private moonSize = 0;

  /** Tonight's moon in its real phase, with its halo, painted once. */
  private paintMoon() {
    const r = Math.min(40, Math.max(22, this.w * 0.065));
    const phase = moonPhase(new Date());
    const lit = moonIllumination(phase);
    const size = Math.ceil(r * 10);
    const dpr = this.dpr;
    const sprite = makeCanvas(size * dpr, size * dpr);
    const ctx = sprite.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const c = size / 2;
    const halo = ctx.createRadialGradient(c, c, r * 0.8, c, c, r * (3.2 + lit * 1.6));
    halo.addColorStop(0, `rgba(215,225,255,${0.1 + lit * 0.16})`);
    halo.addColorStop(1, "rgba(215,225,255,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);
    ctx.translate(c, c);
    // The unlit disc, faint with earthshine.
    ctx.fillStyle = "#1b2440";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    if (lit > 0.02) {
      const waxing = phase < 0.5;
      if (!waxing) ctx.scale(-1, 1);
      const rx = r * Math.abs(Math.cos(2 * Math.PI * phase));
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5);
      ctx.closePath();
      const face = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
      face.addColorStop(0, "#fffaf0");
      face.addColorStop(1, "#e3dcc8");
      ctx.fillStyle = face;
      ctx.fill();
      // A few maria, only where the moon is lit.
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "rgba(120,115,100,0.16)";
      for (const [mx, my, mr] of [[-0.25, -0.2, 0.28], [0.22, 0.15, 0.22], [-0.05, 0.38, 0.16], [0.35, -0.35, 0.12]] as const) {
        ctx.beginPath();
        ctx.arc(mx * r, my * r, mr * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    this.moonSprite = sprite;
    this.moonSize = size;
  }

  private drawMoon(lift: number) {
    if (!this.moonSprite) this.paintMoon();
    const sprite = this.moonSprite;
    if (!sprite) return;
    const size = this.moonSize;
    this.ctx.drawImage(sprite, this.w * 0.22 - size / 2, this.groundY * 0.2 + lift - size / 2, size, size);
  }

  private drawShootingStar(t: number) {
    const ctx = this.ctx;
    if (!this.opts.live) return;
    if (!this.shooting && t > this.nextShootingAt) {
      const fromRight = Math.random() > 0.5;
      this.shooting = {
        x: this.w * (fromRight ? 0.75 + Math.random() * 0.2 : 0.1 + Math.random() * 0.3),
        y: 30 + Math.random() * this.groundY * 0.3,
        vx: (fromRight ? -1 : 1) * (260 + Math.random() * 120),
        vy: 120 + Math.random() * 60,
        at: t,
      };
      this.nextShootingAt = t + 8 + Math.random() * 10;
    }
    const s = this.shooting;
    if (!s) return;
    const age = t - s.at;
    if (age > 0.9) {
      this.shooting = null;
      return;
    }
    const x = s.x + s.vx * age;
    const y = s.y + s.vy * age;
    const fade = Math.sin((age / 0.9) * Math.PI);
    const tail = ctx.createLinearGradient(x, y, x - s.vx * 0.22, y - s.vy * 0.22);
    tail.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
    tail.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = tail;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s.vx * 0.22, y - s.vy * 0.22);
    ctx.stroke();
  }

  private drawClouds(t: number) {
    const ctx = this.ctx;
    for (const c of this.clouds) {
      const span = this.w + c.img.width / this.dpr;
      const x = ((c.x + t * c.sp) % span) - c.img.width / this.dpr;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(c.img, x, c.y, c.img.width / this.dpr, c.img.height / this.dpr);
    }
    ctx.globalAlpha = 1;
  }

  private drawBirds(t: number) {
    if (!this.opts.live) return;
    if (!this.birds && t > this.nextBirdsAt) {
      this.birds = { x: this.w + 30, y: this.groundY * (0.08 + Math.random() * 0.12), at: t };
      this.nextBirdsAt = t + 14 + Math.random() * 14;
    }
    const b = this.birds;
    if (!b) return;
    const age = t - b.at;
    const x = b.x - age * 42;
    if (x < -80) {
      this.birds = null;
      return;
    }
    const ctx = this.ctx;
    ctx.strokeStyle = "rgba(30,50,90,0.38)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const bx = x + i * 16 + (i === 1 ? 6 : 0);
      const by = b.y + (i === 1 ? -8 : i * 4) + Math.sin(age * 2 + i) * 3;
      const flap = Math.sin(age * 9 + i * 1.7) * 2.6;
      ctx.moveTo(bx - 4.5, by - flap);
      ctx.quadraticCurveTo(bx - 1.5, by - 2.2, bx, by);
      ctx.quadraticCurveTo(bx + 1.5, by - 2.2, bx + 4.5, by - flap);
    }
    ctx.stroke();
  }

  private drawCypresses(t: number) {
    const ctx = this.ctx;
    const sprite = this.cypressSprite;
    if (!sprite) return;
    const sw = sprite.width / this.dpr;
    const sh = sprite.height / this.dpr;
    const trees: Array<[number, number]> = [[this.w * 0.9, 1], [this.w * 0.985, 0.82]];
    for (const [x, k] of trees) {
      const sway = (windAt(x, t * 0.6) + this.gustAt(x, t) * 0.6) * 0.045;
      ctx.save();
      ctx.translate(x, this.groundY + 14);
      ctx.transform(1, 0, -sway, 1, 0, 0);
      ctx.drawImage(sprite, (-sw * k) / 2, -sh * k, sw * k, sh * k);
      ctx.restore();
    }
  }

  private drawBlossomTree(t: number, p: Palette) {
    const ctx = this.ctx;
    const root = this.tree;
    if (!root) return;
    const baseX = this.w * 0.74;
    const baseY = this.groundY + 10;
    const wind = windAt(baseX, t * 0.7) + this.gustAt(baseX, t) * 0.7;
    const tips: Array<[number, number, number]> = [];
    const byDepth: Path2D[] = Array.from({ length: 7 }, () => new Path2D());
    const walk = (b: Branch, x: number, y: number, angle: number) => {
      const a = angle + b.angle + wind * 0.035 * (b.depth + 1);
      const x2 = x + Math.sin(a) * b.len;
      const y2 = y - Math.cos(a) * b.len;
      byDepth[b.depth]!.moveTo(x, y);
      byDepth[b.depth]!.lineTo(x2, y2);
      if (!b.children.length) tips.push([x2, y2, a]);
      for (const child of b.children) walk(child, x2, y2, a);
    };
    walk(root, baseX, baseY, -0.05);
    ctx.strokeStyle = p.branch;
    ctx.lineCap = "round";
    byDepth.forEach((path, depth) => {
      ctx.lineWidth = Math.max(0.8, 7 - depth * 1.1);
      ctx.stroke(path);
    });
    // leaves under the blossom
    ctx.fillStyle = p.leaves;
    ctx.beginPath();
    for (const [x, y] of tips) {
      ctx.moveTo(x + 6, y);
      ctx.ellipse(x, y, 6, 4, 0.4, 0, Math.PI * 2);
    }
    ctx.fill();
    // blossom
    tips.forEach(([x, y], i) => {
      ctx.fillStyle = p.blossoms[i % p.blossoms.length]!;
      ctx.beginPath();
      ctx.arc(x + ((i * 7) % 5) - 2, y - 2, 3.2, 0, Math.PI * 2);
      ctx.arc(x + 3, y + 2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
    if (this.opts.treeFruit) {
      ctx.fillStyle = this.opts.mode === "night" ? "#6b1f26" : "#c63241";
      tips.forEach(([x, y], i) => {
        if (i % 5 !== 0) return;
        ctx.beginPath();
        ctx.arc(x - 3, y + 7, 4.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  private drawPalm(t: number, p: Palette) {
    const ctx = this.ctx;
    const baseX = this.w * 0.08;
    const baseY = this.groundY + 18;
    const H = Math.min(330, this.h * 0.4);
    const wind = windAt(baseX, t * 0.7) + this.gustAt(baseX, t) * 0.8;
    const crownX = baseX + H * 0.16 + wind * 5;
    const crownY = baseY - H;
    const ctrlX = baseX + H * 0.02;
    const ctrlY = baseY - H * 0.55;

    // Trunk: tapering, with the rings a palm carries.
    ctx.strokeStyle = p.palmTrunk;
    ctx.lineCap = "round";
    const steps = 22;
    let px = baseX;
    let py = baseY;
    for (let i = 1; i <= steps; i++) {
      const s = i / steps;
      const x = (1 - s) * (1 - s) * baseX + 2 * (1 - s) * s * ctrlX + s * s * crownX;
      const y = (1 - s) * (1 - s) * baseY + 2 * (1 - s) * s * ctrlY + s * s * crownY;
      ctx.lineWidth = 11 - s * 5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
      px = x;
      py = y;
    }
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < steps; i += 1) {
      const s = i / steps;
      const x = (1 - s) * (1 - s) * baseX + 2 * (1 - s) * s * ctrlX + s * s * crownX;
      const y = (1 - s) * (1 - s) * baseY + 2 * (1 - s) * s * ctrlY + s * s * crownY;
      const half = (11 - s * 5) / 2;
      ctx.moveTo(x - half, y);
      ctx.lineTo(x + half, y + 1.5);
    }
    ctx.stroke();

    if (this.opts.palmFruit) {
      ctx.fillStyle = this.opts.mode === "night" ? "#4a2a12" : "#b5651d";
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(crownX + Math.cos(a) * 7 + (i % 2 ? 6 : -6), crownY + 10 + Math.abs(Math.sin(a)) * 9, 2.6, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fronds: a fan of arching spines, each with its leaflets.
    const fronds = 11;
    const L = H * 0.36;
    const spines = new Path2D();
    const leaflets = new Path2D();
    for (let i = 0; i < fronds; i++) {
      const spread = -Math.PI * 0.95 + (i / (fronds - 1)) * Math.PI * 0.9;
      const a = spread + wind * 0.09 + Math.sin(t * 1.4 + i) * 0.035;
      const droop = 0.55 + Math.abs(Math.cos(spread + Math.PI / 2)) * 0.35;
      const ex = crownX + Math.cos(a) * L;
      const ey = crownY + Math.sin(a) * L * 0.55 + L * droop * 0.55;
      const mx = crownX + Math.cos(a) * L * 0.55;
      const my = crownY + Math.sin(a) * L * 0.55 - L * 0.12;
      spines.moveTo(crownX, crownY);
      spines.quadraticCurveTo(mx, my, ex, ey);
      for (let j = 1; j < 16; j++) {
        const s = j / 16;
        const x = (1 - s) * (1 - s) * crownX + 2 * (1 - s) * s * mx + s * s * ex;
        const y = (1 - s) * (1 - s) * crownY + 2 * (1 - s) * s * my + s * s * ey;
        const len = (1 - s) * 16 + 4;
        leaflets.moveTo(x, y);
        leaflets.lineTo(x + Math.cos(a + 1.9) * len, y + Math.abs(Math.sin(a + 1.9)) * len + 2);
        leaflets.moveTo(x, y);
        leaflets.lineTo(x + Math.cos(a - 1.9) * len * 0.8, y + Math.abs(Math.sin(a - 1.9)) * len + 3);
      }
    }
    ctx.strokeStyle = p.palmFrond;
    ctx.lineWidth = 2.4;
    ctx.stroke(spines);
    ctx.lineWidth = 1.3;
    ctx.stroke(leaflets);
  }

  private drawGrass(blades: Blade[], colors: string[], t: number, baseY: number, flexScale: number) {
    const ctx = this.ctx;
    let current = -1;
    let path: Path2D | null = null;
    const flush = () => {
      if (path && current >= 0) {
        ctx.fillStyle = colors[current]!;
        ctx.fill(path);
      }
    };
    for (const b of blades) {
      if (b.c !== current) {
        flush();
        current = b.c;
        path = new Path2D();
      }
      const wind = windAt(b.x, t) + this.gustAt(b.x, t);
      const a = b.lean + (wind * 0.34 + Math.sin(t * 2.2 + b.ph) * 0.05) * b.flex * flexScale;
      const tipX = b.x + Math.sin(a) * b.h;
      const tipY = baseY - Math.cos(a) * b.h;
      const cx = b.x + Math.sin(a * 0.45) * b.h * 0.5;
      const cy = baseY - b.h * 0.55;
      path!.moveTo(b.x - b.w / 2, baseY);
      path!.quadraticCurveTo(cx - b.w * 0.3, cy, tipX, tipY);
      path!.quadraticCurveTo(cx + b.w * 0.3, cy, b.x + b.w / 2, baseY);
    }
    flush();
  }

  private drawFlowers(t: number, night: boolean, dim: number) {
    const ctx = this.ctx;
    for (const f of this.flowers) {
      const age = t - f.born;
      const grow = f.born < 0 ? 1 : easeOutBack(age / 1.4);
      if (grow <= 0.01) continue;
      const wind = windAt(f.x, t) + this.gustAt(f.x, t);
      const a = f.tilt + wind * 0.22 + Math.sin(t * 1.8 + f.ph) * 0.03;
      const stem = f.stem * Math.min(1, grow);
      const hx = f.x + Math.sin(a) * stem;
      const hy = f.y - Math.cos(a) * stem;
      ctx.strokeStyle = night ? "#123222" : "#3f8a45";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(f.x + Math.sin(a * 0.4) * stem * 0.5, f.y - stem * 0.5, hx, hy);
      ctx.stroke();
      // Most flowers close a little at night; jasmine opens and glows.
      const open = f.kind === "jasmine" ? 1 : night ? 0.72 : 1;
      const s = f.size * grow * open;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(a);
      ctx.globalAlpha = f.kind === "jasmine" ? 1 : dim;
      this.drawHead(f, s, night);
      ctx.restore();
      if (night && f.kind === "jasmine" && this.glow) {
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 1.3 + f.ph);
        ctx.drawImage(this.glow, hx - 12, hy - 12, 24, 24);
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawHead(f: Flower, s: number, night: boolean) {
    const ctx = this.ctx;
    switch (f.kind) {
      case "tulip": {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(-3.2 * s, -1 * s, 3.4 * s, 6.5 * s, -0.35, 0, Math.PI * 2);
        ctx.ellipse(3.2 * s, -1 * s, 3.4 * s, 6.5 * s, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.beginPath();
        ctx.ellipse(0, -1.5 * s, 3.2 * s, 6.8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(0, -1.8 * s, 2.8 * s, 6.4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "daisy": {
        ctx.fillStyle = night ? "#d9dbe6" : "#ffffff";
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const x = Math.cos(a) * 4.2 * s;
          const y = Math.sin(a) * 4.2 * s;
          ctx.moveTo(x + 2.6 * s, y);
          ctx.ellipse(x, y, 3.4 * s, 1.5 * s, a, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = "#f2c230";
        ctx.beginPath();
        ctx.arc(0, 0, 2.4 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "rose": {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5.4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(80,0,20,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0.5 * s, 0.3 * s, 3.4 * s, 0.4, 5.2);
        ctx.moveTo(1.6 * s, 0);
        ctx.arc(0, 0, 1.6 * s, 0, 4.4);
        ctx.stroke();
        break;
      }
      case "poppy": {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          ctx.moveTo(Math.cos(a) * 3.5 * s + 4 * s, Math.sin(a) * 3.5 * s);
          ctx.arc(Math.cos(a) * 3.5 * s, Math.sin(a) * 3.5 * s, 4 * s, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.fillStyle = "#1d1410";
        ctx.beginPath();
        ctx.arc(0, 0, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "lavender": {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const y = -i * 2.6 * s;
          const r = (2.2 - i * 0.18) * s;
          ctx.moveTo(r, y);
          ctx.ellipse(0, y, r, r * 1.3, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        break;
      }
      case "jasmine": {
        ctx.fillStyle = "#ffffff";
        for (const [ox, oy] of [[0, 0], [-4.5, 2.5], [4, 3]] as const) {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const x = ox * s + Math.cos(a) * 2.3 * s;
            const y = oy * s + Math.sin(a) * 2.3 * s;
            ctx.moveTo(x + 1.5 * s, y);
            ctx.arc(x, y, 1.5 * s, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.fillStyle = "#f6e7a6";
          ctx.beginPath();
          ctx.arc(ox * s, oy * s, 0.8 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
        }
        break;
      }
    }
  }

  private drawFireflies(t: number) {
    const ctx = this.ctx;
    const glow = this.glow;
    if (!glow) return;
    const count = Math.min(this.fireflies.length, 10 + Math.round(this.opts.blooms / 5));
    for (let i = 0; i < count; i++) {
      const f = this.fireflies[i]!;
      const x = f.x + Math.sin(t * f.sp + f.ph) * f.rx + Math.sin(t * f.sp * 2.3 + f.ph) * 8;
      const y = f.y + Math.cos(t * f.sp * 1.3 + f.ph) * f.ry;
      const pulse = Math.max(0, Math.sin(t * 1.6 + f.ph * 3));
      ctx.globalAlpha = 0.2 + pulse * 0.8;
      ctx.drawImage(glow, x - 9, y - 9, 18, 18);
    }
    ctx.globalAlpha = 1;
  }

  private drawPetals(t: number) {
    const ctx = this.ctx;
    const dt = 1 / 30;
    for (let i = 0; i < this.petals.length; i++) {
      const pt = this.petals[i]!;
      if (this.opts.live) {
        pt.x += (pt.vx + (windAt(pt.x, t) + this.gustAt(pt.x, t)) * 22) * dt;
        pt.y += pt.vy * dt;
        pt.rot += pt.vr * dt;
      }
      if (pt.y > this.h || pt.x < -20) this.petals[i] = this.newPetal();
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.s, pt.s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawButterflies(t: number) {
    const ctx = this.ctx;
    for (const b of this.butterflies) {
      const x = ((b.x + t * 14 * b.dir * b.sp * 2) % (this.w + 60) + this.w + 60) % (this.w + 60) - 30;
      const y = b.y + Math.sin(t * b.sp * 3 + b.ph) * 18 + Math.sin(t * 1.7 + b.ph) * 6;
      const flap = 0.25 + Math.abs(Math.sin(t * 11 + b.ph)) * 0.75;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(b.dir, 1);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(-3.6 * flap, -2, 4 * flap, 3.2, -0.5, 0, Math.PI * 2);
      ctx.ellipse(3.6 * flap, -2, 4 * flap, 3.2, 0.5, 0, Math.PI * 2);
      ctx.ellipse(-2.4 * flap, 2.6, 2.6 * flap, 2.2, -0.3, 0, Math.PI * 2);
      ctx.ellipse(2.4 * flap, 2.6, 2.6 * flap, 2.2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2118";
      ctx.fillRect(-0.6, -4, 1.2, 8);
      ctx.restore();
    }
  }
}
