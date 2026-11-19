/**
 * «الحديقة» — a living garden drawn behind every page of the «أفق» design.
 *
 * One canvas, back to front:
 *   sky (and the Milky Way) → moon in tonight's real phase, or sun and clouds
 *   → stars, shooting stars, birds → far hills with a distant mosque → near
 *   hills → a date palm, two cypresses and a pomegranate tree, all in the wind
 *   → back grass → flowers that open and close with the light → front grass
 *   → fireflies at night, butterflies and drifting petals by day.
 *
 * The plants themselves (gardenSprites.ts) are painted once each in full
 * detail — a date palm with its criss-cross trunk and leaflet fronds, cypress
 * foliage, a pomegranate tree, roses that open petal by petal — all lit from
 * the same side as the sun or the Moon, and only moved frame by frame.
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
import { cancelFrame, context2d, newCanvas, requestFrame, type AnyCanvas, type Ctx2D } from "@/components/ufuq/garden/canvasKit";
import {
  composeSprites,
  FLOWER_STAGES,
  flowerVariants,
  mix,
  paintCloud,
  paintCypress,
  paintDates,
  paintFlowerHead,
  paintFrond,
  paintPalmTrunk,
  paintPomegranate,
  paintStemLeaf,
  type FlowerKind,
  type Sprite,
} from "@/components/ufuq/garden/gardenSprites";

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

type Blade = { x: number; h: number; w: number; lean: number; flex: number; ph: number; c: number; dy: number };
type Flower = { x: number; y: number; stem: number; kind: FlowerKind; variant: number; size: number; ph: number; born: number; tilt: number; leaf: number };
type Star = { x: number; y: number; r: number; a: number; tw: number; ph: number; tint: string };
type Firefly = { x: number; y: number; ph: number; sp: number; rx: number; ry: number };
type Butterfly = { x: number; y: number; ph: number; sp: number; color: string; dir: number };
type Petal = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; s: number; color: string };
/** fs < 1: the frond points toward us and looks shorter (foreshortened). */
type Frond = { side: 1 | -1; elev: number; k: number; v: number; back: boolean; ph: number; fs?: number };
type Mote = { x: number; y: number; ph: number; sp: number; r: number };
type Plants = {
  trunk: Sprite | null;
  /** The older fronds behind, baked into one image around the crown. */
  backCrown: Sprite | null;
  dry: Array<Sprite | null>;
  frondsFront: Array<Sprite | null>;
  dates: Array<Sprite | null>;
  cypress: Array<Sprite | null>;
  tree: Sprite | null;
  treeFruit: Sprite | null;
  roseLeaf: Sprite | null;
  blade: Sprite | null;
};
type Gust = { x: number; s: number; at: number };

type Palette = {
  sky: Array<[number, string]>;
  farHills: string;
  mosque: string;
  nearHills: string;
  ground: [string, string];
  grassBack: string[];
  grassFront: string[];
  blossoms: string[];
};

const PALETTES: Record<GardenMode, Palette> = {
  day: {
    sky: [[0, "#5e97dc"], [0.34, "#9cc4ee"], [0.68, "#d6e8f8"], [1, "#f1f7fd"]],
    farHills: "rgba(32, 72, 140, 0.30)",
    mosque: "rgba(28, 62, 122, 0.34)",
    nearHills: "#7fae96",
    ground: ["#4d8f58", "#2f6a3c"],
    grassBack: ["#6fae7c", "#5d9f6d", "#7dba86", "#8cbf7a", "#6aa36a"],
    grassFront: ["#3f8f4a", "#4fa358", "#2f7a3c", "#66b86a", "#5a9a3e", "#7ab45a", "#357f48"],
    blossoms: ["#e8452a", "#ff7a50", "#f05a3a", "#ffa07a"],
  },
  night: {
    sky: [[0, "#010207"], [0.48, "#040a1a"], [0.84, "#0b1630"], [1, "#14223f"]],
    farHills: "#0a1430",
    mosque: "#0b1633",
    nearHills: "#07141b",
    ground: ["#0a1d14", "#030a07"],
    grassBack: ["#0d241b", "#0b2017", "#10291f", "#0f2620", "#0c221a"],
    grassFront: ["#123423", "#174029", "#0e2a1c", "#1d4a30", "#16382a", "#1a4232", "#10301f"],
    blossoms: ["#5c2a30", "#6a3438", "#4a2228", "#7a4044"],
  },
};

/** Roses most of all; the rest keep the bed varied. */
const KINDS: FlowerKind[] = ["rose", "tulip", "rose", "daisy", "rose", "lavender", "tulip", "jasmine", "poppy", "rose", "daisy", "jasmine"];

/** Flower heads are painted at this diameter and drawn smaller. */
const HEAD_BASE = 40;
/** How far the palm leans from its base to its crown, as a share of its height. */
const PALM_LEAN = 0.14;

function drawSprite(ctx: Ctx2D, s: Sprite | null, x: number, y: number, k = 1) {
  if (!s) return;
  ctx.drawImage(s.canvas, x - s.ax * k, y - s.ay * k, s.w * k, s.h * k);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function makeCanvas(w: number, h: number): AnyCanvas {
  return newCanvas(w, h);
}

export class GardenEngine {
  /** Moving things, redrawn every frame. */
  private readonly canvas: AnyCanvas;
  private readonly ctx: Ctx2D;
  /** Sky, hills and the mosque, painted once; the compositor layers it for free. */
  private readonly bgCanvas: AnyCanvas;
  private readonly bg: Ctx2D;
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
  private plants: Plants | null = null;
  private heads = new Map<string, Sprite | null>();
  private palmH = 0;
  private treeH = 0;
  private fronds: Frond[] = [];
  private dryFronds: Frond[] = [];
  private motes: Mote[] = [];
  /** The nearest grass, drawn small and scaled up: out of focus, and cheaper. */
  private soft: AnyCanvas | null = null;
  private softCtx: Ctx2D | null = null;
  private softH = 0;
  private rowMax = { back: 30, mid: 34, front: 48 };
  private glow: AnyCanvas | null = null;
  private clouds: Array<{ sprite: Sprite; x: number; y: number; sp: number }> = [];

  private stars: Star[] = [];
  private back: Blade[] = [];
  private mid: Blade[] = [];
  private front: Blade[] = [];
  private flowers: Flower[] = [];
  private fireflies: Firefly[] = [];
  private butterflies: Butterfly[] = [];
  private petals: Petal[] = [];
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
  private devicePixels = 0;

  constructor(
    bgCanvas: AnyCanvas,
    bg: Ctx2D,
    canvas: AnyCanvas,
    ctx: Ctx2D,
    opts: GardenOptions,
  ) {
    this.bgCanvas = bgCanvas;
    this.bg = bg;
    this.canvas = canvas;
    this.ctx = ctx;
    this.opts = { ...opts };
  }

  /** null where canvas is unavailable (tests, very old WebViews). */
  static create(bgCanvas: AnyCanvas, canvas: AnyCanvas, opts: GardenOptions): GardenEngine | null {
    try {
      const bg = context2d(bgCanvas, { alpha: false });
      const ctx = context2d(canvas);
      return bg && ctx ? new GardenEngine(bgCanvas, bg, canvas, ctx, opts) : null;
    } catch {
      return null;
    }
  }

  private get now() {
    return (performance.now() - this.startedAt) / 1000;
  }

  /** `dpr` comes from the page when the engine runs in a worker (which has no screen). */
  resize(w: number, h: number, devicePixels?: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    if (devicePixels) this.devicePixels = devicePixels;
    const device = this.devicePixels || globalThis.devicePixelRatio || 1;
    this.dpr = Math.min(this.maxDpr, device);
    this.bgDpr = Math.min(2, device);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.bgCanvas.width = Math.round(this.w * this.bgDpr);
    this.bgCanvas.height = Math.round(this.h * this.bgDpr);
    this.groundH = Math.min(200, Math.max(120, this.h * 0.2));
    this.groundY = this.h - this.groundH;
    this.soft ??= makeCanvas(1, 1);
    this.softCtx ??= context2d(this.soft);
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
      this.raf = requestFrame(loop);
      if (ts - this.lastFrame < 32) return; // 30 frames a second is plenty for wind
      this.lastFrame = ts;
      const t0 = performance.now();
      this.drawFrame(this.now);
      this.adapt(performance.now() - t0);
    };
    this.raf = requestFrame(loop);
  }

  stop() {
    this.running = false;
    cancelFrame(this.raf);
    this.drawFrame(this.now);
  }

  destroy() {
    this.running = false;
    cancelFrame(this.raf);
    this.plants = this.glow = null;
    this.soft = null;
    this.softCtx = null;
    this.heads.clear();
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

    const blade = (base: number, minH: number, maxH: number, colors: number, rootSpread = 0): Blade => ({
      dy: rnd() * rootSpread,
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
    this.back = Array.from({ length: backCount }, () => blade(0, 10 / scale * scale2, 26 / scale * scale2 + 4, 5, groundH * 0.06)).sort((a, b) => a.c - b.c);
    this.mid = Array.from({ length: midCount }, () => blade(2, 14, 34, 7, groundH * 0.16)).sort((a, b) => a.c - b.c);
    this.front = Array.from({ length: frontCount }, () => blade(1, 22, 48, 7)).sort((a, b) => a.c - b.c);

    const rowMax = (rows: Blade[]) => rows.reduce((m, b) => Math.max(m, b.h), 1);
    this.rowMax = { back: rowMax(this.back), mid: rowMax(this.mid), front: rowMax(this.front) };

    // The palm's crown: older fronds behind, rising ones and drooping ones in
    // front, the same crown every day.
    this.palmH = Math.min(330, h * 0.4);
    this.treeH = Math.min(250, h * 0.28);
    const fr = seededRandom(613);
    const back: Frond[] = [-1.32, -1.05, -0.78, -0.5, -0.22].flatMap((elev, i) => [
      { side: 1 as const, elev: elev + fr() * 0.12, k: 0.82 + fr() * 0.15, v: i % 3, back: true, ph: fr() * 6 },
      { side: -1 as const, elev: elev + 0.1 + fr() * 0.12, k: 0.82 + fr() * 0.15, v: (i + 1) % 3, back: true, ph: fr() * 6 },
    ]);
    const front: Frond[] = [-1.15, -0.62, -0.1, 0.42, 0.95].flatMap((elev, i) => [
      { side: 1 as const, elev: elev + fr() * 0.1, k: 0.92 + fr() * 0.14, v: i % 3, back: false, ph: fr() * 6 },
      { side: -1 as const, elev: elev + 0.05 + fr() * 0.1, k: 0.9 + fr() * 0.14, v: (i + 2) % 3, back: false, ph: fr() * 6 },
    ]);
    // Two fronds reach out toward us, shortened by perspective.
    const toward: Frond[] = [
      { side: 1, elev: 0.18, k: 1, v: 1, back: false, ph: fr() * 6, fs: 0.5 },
      { side: -1, elev: 0.32, k: 0.95, v: 2, back: false, ph: fr() * 6, fs: 0.42 },
    ];
    this.fronds = [...back, ...front, ...toward];
    this.dryFronds = [
      { side: 1, elev: 1.3, k: 0.62, v: 0, back: true, ph: 1 },
      { side: -1, elev: 1.38, k: 0.58, v: 1, back: true, ph: 2 },
      { side: 1, elev: 1.52, k: 0.5, v: 1, back: true, ph: 3 },
    ];
    this.motes = Array.from({ length: 26 }, () => ({
      x: rnd() * w,
      y: groundY * 0.25 + rnd() * h * 0.55,
      ph: rnd() * 100,
      sp: 0.2 + rnd() * 0.4,
      r: 0.6 + rnd() * 1.1,
    }));

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
      const depth = rnd();
      this.flowers.push({
        x: 12 + rnd() * (w - 24),
        y: groundY + 6 + depth * groundH * 0.42,
        stem: (22 + rnd() * 30) * (0.75 + depth * 0.5) * (groundH / 110),
        kind,
        variant: Math.floor(rnd() * flowerVariants(kind)),
        size: (1.05 + rnd() * 0.5) * (0.8 + depth * 0.45),
        ph: rnd() * Math.PI * 2,
        born,
        tilt: (rnd() - 0.5) * 0.3,
        leaf: rnd() > 0.5 ? 1 : -1,
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
    this.heads.clear();
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
      // Shafts of sunlight slanting down through the air.
      const sx = w * 0.2;
      const sy = groundY * 0.18;
      s.save();
      s.globalCompositeOperation = "lighter";
      // Soft-edged, and faint near the sun where its glare already fills the air.
      if ("filter" in s) s.filter = `blur(${Math.round(w * 0.03)}px)`;
      for (const [ang, spread, a] of [[0.95, 0.07, 0.05], [1.14, 0.05, 0.035], [1.32, 0.08, 0.045], [0.78, 0.05, 0.03]] as const) {
        const len = h * 1.1;
        const ray = s.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
        ray.addColorStop(0, "rgba(255,244,214,0)");
        ray.addColorStop(0.18, `rgba(255,244,214,${a})`);
        ray.addColorStop(0.6, `rgba(255,244,214,${a * 0.45})`);
        ray.addColorStop(1, "rgba(255,244,214,0)");
        s.fillStyle = ray;
        s.beginPath();
        s.moveTo(sx, sy);
        s.lineTo(sx + Math.cos(ang - spread) * len, sy + Math.sin(ang - spread) * len);
        s.lineTo(sx + Math.cos(ang + spread) * len, sy + Math.sin(ang + spread) * len);
        s.closePath();
        s.fill();
      }
      s.restore();
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
    // Far away is a little out of focus, like the eye or a lens sees it.
    if ("filter" in g) g.filter = "blur(1.4px)";
    ridge(groundY - 22, 70, 0.006, 0.019, 1.7);
    g.fillStyle = p.farHills;
    g.fill();
    this.paintMosque(g, w * 0.6, groundY - 62, Math.min(1.25, w / 360), p.mosque, night);
    if ("filter" in g) g.filter = "none";
    // Air between us and the far hills: they fade into the sky a little.
    const haze = g.createLinearGradient(0, groundY - 110, 0, groundY + 10);
    haze.addColorStop(0, night ? "rgba(20,34,63,0)" : "rgba(214,232,248,0)");
    haze.addColorStop(1, night ? "rgba(20,34,63,0.55)" : "rgba(222,236,250,0.6)");
    g.fillStyle = haze;
    g.fillRect(0, groundY - 110, w, 120);
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
    // Soil and fallen leaves, so the ground is not one flat colour.
    const soil = seededRandom(5);
    for (let i = 0; i < Math.round(w * 1.2); i++) {
      const x = soil() * w;
      const y = groundY + 8 + Math.pow(soil(), 0.8) * (h - groundY);
      g.fillStyle = night
        ? `rgba(${soil() > 0.5 ? "0,0,0" : "60,80,110"},${0.1 + soil() * 0.15})`
        : `rgba(${soil() > 0.5 ? "30,60,25" : "150,190,110"},${0.12 + soil() * 0.16})`;
      g.beginPath();
      g.ellipse(x, y, 1 + soil() * 2.2, 0.6 + soil() * 1, soil() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // Shadows the trees cast away from the light (the light is up and to the left).
    const shadow = (x: number, y: number, r: number) => {
      const sg = g.createRadialGradient(x + r * 0.55, y, 1, x + r * 0.55, y, r);
      sg.addColorStop(0, night ? "rgba(0,0,0,0.42)" : "rgba(20,50,25,0.32)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      g.save();
      g.translate(x + r * 0.55, y);
      g.scale(1, 0.22);
      g.translate(-(x + r * 0.55), -y);
      g.fillStyle = sg;
      g.fillRect(x - r, y - r, r * 3, r * 2);
      g.restore();
    };
    shadow(w * 0.08, groundY + 24, this.palmH * 0.3);
    shadow(w * 0.74, groundY + 10, this.treeH * 0.42);
    shadow(w * 0.9, groundY + 14, 40);
    shadow(w * 0.985, groundY + 14, 34);
    this.painted = true;

    this.paintPlants();

    // One soft glow, reused by every firefly and jasmine at night.
    const glow = makeCanvas(48, 48);
    const gl = context2d(glow);
    if (gl) {
      const rg = gl.createRadialGradient(24, 24, 0, 24, 24, 24);
      rg.addColorStop(0, "rgba(255,246,190,1)");
      rg.addColorStop(0.25, "rgba(230,255,160,0.55)");
      rg.addColorStop(1, "rgba(200,255,140,0)");
      gl.fillStyle = rg;
      gl.fillRect(0, 0, 48, 48);
    }
    this.glow = glow;

    // Day clouds: shaded heaps, lit on top and grey underneath.
    this.clouds = [];
    if (!night) {
      const rnd = seededRandom(31);
      for (let i = 0; i < 4; i++) {
        const sprite = paintCloud(130 + rnd() * 140, dpr, 40 + i);
        if (sprite) this.clouds.push({ sprite, x: rnd() * w, y: 40 + rnd() * groundY * 0.36, sp: 3 + rnd() * 5 });
      }
    }
  }

  /** Every plant, painted once for this mode and size. */
  private paintPlants() {
    const mode = this.opts.mode;
    const dpr = this.dpr;
    const H = this.palmH;
    const L = H * 0.44;
    const tree = paintPomegranate(this.treeH, mode, dpr, 77);
    const ch = Math.min(380, this.h * 0.44);
    const backFronds = [0, 1, 2].map((i) => paintFrond(L, mode, dpr, 300 + i, 0.55));
    this.plants = {
      trunk: paintPalmTrunk(H, PALM_LEAN, mode, dpr),
      backCrown: this.paintBackCrown(backFronds, L),
      dry: [0, 1].map((i) => paintFrond(L, mode, dpr, 700 + i, 0.2, true)),
      frondsFront: [0, 1, 2].map((i) => paintFrond(L, mode, dpr, 400 + i, 0)),
      dates: [0, 1, 2].map((i) => paintDates(H * 0.13, mode, dpr, 500 + i)),
      cypress: [paintCypress(48, ch, mode, dpr, 21), paintCypress(40, ch * 0.82, mode, dpr, 22)],
      tree: composeSprites([tree.wood, tree.leaves, tree.blossom], dpr),
      treeFruit: composeSprites([tree.wood, tree.leaves, tree.blossom, tree.fruit], dpr),
      roseLeaf: paintStemLeaf(22, mode, dpr, false),
      blade: paintStemLeaf(30, mode, dpr, true),
    };
  }

  /** The back fronds, laid out once around the crown; they sway together. */
  private paintBackCrown(fronds: Array<Sprite | null>, L: number): Sprite | null {
    const R = Math.ceil(L * 1.15);
    const dpr = this.dpr;
    const canvas = makeCanvas(R * 2 * dpr, R * 2 * dpr);
    const g = context2d(canvas);
    if (!g) return null;
    for (const f of this.fronds) {
      if (!f.back) continue;
      const s = fronds[f.v];
      if (!s) continue;
      g.setTransform(dpr, 0, 0, dpr, R * dpr, R * dpr);
      g.scale(f.side, 1);
      g.rotate(f.elev);
      g.drawImage(s.canvas, -s.ax * f.k, -s.ay * f.k, s.w * f.k, s.h * f.k);
    }
    return composeSprites([{ canvas, w: R * 2, h: R * 2, ax: R, ay: R }], dpr);
  }

  /** A flower head at one stage of opening, painted the first time it is needed. */
  private head(f: Flower, stage: number): Sprite | null {
    const idx = Math.round(clamp01(stage) * (FLOWER_STAGES - 1));
    const key = `${f.kind}:${f.variant}:${idx}`;
    let sprite = this.heads.get(key);
    if (sprite === undefined) {
      sprite = paintFlowerHead(f.kind, f.variant, idx / (FLOWER_STAGES - 1), HEAD_BASE, this.opts.mode, this.dpr);
      this.heads.set(key, sprite);
    }
    return sprite;
  }

  private paintMosque(g: Ctx2D, cx: number, base: number, k: number, color: string, night: boolean) {
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
    this.drawTree(t);
    this.drawPalm(t);

    const { back, mid, front } = this.rowMax;
    this.drawGrass(this.back, p.grassBack, t, groundY + 4, 0.7, back, night);
    this.drawFlowers(t, night);
    this.drawGrass(this.mid, p.grassFront, t, groundY + this.groundH * 0.5, 0.85, mid, night);
    this.drawNearGrass(p.grassFront, t, front, night);

    if (night) this.drawFireflies(t);
    else {
      this.drawPetals(t);
      this.drawButterflies(t);
      this.drawMotes(t);
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

  private moonSprite: AnyCanvas | null = null;
  private moonSize = 0;

  /** Tonight's moon, drawn (not photographed), in its real phase, with its halo. */
  private paintMoon() {
    const r = Math.min(40, Math.max(22, this.w * 0.065));
    const phase = moonPhase(new Date());
    const lit = moonIllumination(phase);
    const size = Math.ceil(r * 10);
    const dpr = this.dpr;
    const sprite = makeCanvas(size * dpr, size * dpr);
    const ctx = context2d(sprite);
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
      const span = this.w + c.sprite.w;
      const x = ((c.x + t * c.sp) % span) - c.sprite.w;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(c.sprite.canvas, x, c.y, c.sprite.w, c.sprite.h);
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
    const plants = this.plants;
    if (!plants) return;
    const trees: Array<[number, Sprite | null]> = [[this.w * 0.9, plants.cypress[0] ?? null], [this.w * 0.985, plants.cypress[1] ?? null]];
    for (const [x, sprite] of trees) {
      const sway = (windAt(x, t * 0.6) + this.gustAt(x, t) * 0.6) * 0.045;
      ctx.save();
      ctx.translate(x, this.groundY + 14);
      ctx.transform(1, 0, -sway, 1, 0, 0);
      drawSprite(ctx, sprite, 0, 0);
      ctx.restore();
    }
  }

  /** The pomegranate, one image bending in the wind from its root. */
  private drawTree(t: number) {
    const ctx = this.ctx;
    const plants = this.plants;
    if (!plants) return;
    const x = this.w * 0.74;
    const y = this.groundY + 10;
    const wind = windAt(x, t * 0.7) + this.gustAt(x, t) * 0.7;
    const sway = wind * 0.03 + Math.sin(t * 2.1) * 0.004;
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(1, 0, -sway, 1, 0, 0);
    drawSprite(ctx, this.opts.treeFruit ? plants.treeFruit : plants.tree, 0, 0);
    ctx.restore();
  }

  /** The date palm: the trunk bends as one, each frond moves on its own. */
  private drawPalm(t: number) {
    const ctx = this.ctx;
    const plants = this.plants;
    if (!plants) return;
    const baseX = this.w * 0.08;
    const baseY = this.groundY + 24;
    const H = this.palmH;
    const wind = windAt(baseX, t * 0.7) + this.gustAt(baseX, t) * 0.8;
    const bend = (wind * 5) / H;
    const crownX = baseX + PALM_LEAN * H + wind * 5;
    const crownY = baseY - H + 6;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.transform(1, 0, -bend, 1, 0, 0);
    drawSprite(ctx, plants.trunk, 0, 0);
    ctx.restore();

    const frond = (f: Frond) => {
      const sprite = plants.frondsFront[f.v] ?? null;
      if (!sprite) return;
      ctx.save();
      ctx.translate(crownX, crownY);
      ctx.scale(f.side, 1);
      ctx.rotate(f.elev + wind * 0.09 * f.side + Math.sin(t * 1.4 + f.ph) * 0.03);
      if (f.fs) ctx.scale(f.fs, 1);
      drawSprite(ctx, sprite, 0, 0, f.k);
      ctx.restore();
    };
    // Old fronds, dry and hanging, are the first thing under the crown.
    for (const f of this.dryFronds) {
      const sprite = plants.dry[f.v] ?? null;
      ctx.save();
      ctx.translate(crownX, crownY + 4);
      ctx.scale(f.side, 1);
      ctx.rotate(f.elev + wind * 0.04 * f.side);
      drawSprite(ctx, sprite, 0, 0, f.k);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(crownX, crownY);
    ctx.rotate(wind * 0.035 + Math.sin(t * 1.1) * 0.012);
    drawSprite(ctx, plants.backCrown, 0, 0);
    ctx.restore();
    // The heart of the crown: frond bases packed in shadow.
    const heart = ctx.createRadialGradient(crownX - 2, crownY - 2, 1, crownX, crownY, H * 0.07);
    heart.addColorStop(0, this.opts.mode === "night" ? "rgba(8,10,8,0.95)" : "rgba(58,48,24,0.95)");
    heart.addColorStop(0.6, this.opts.mode === "night" ? "rgba(10,16,12,0.7)" : "rgba(70,74,34,0.6)");
    heart.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = heart;
    ctx.beginPath();
    ctx.ellipse(crownX, crownY, H * 0.07, H * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.opts.palmFruit) {
      const swing = wind * 0.05;
      plants.dates.forEach((sprite, i) => {
        ctx.save();
        ctx.translate(crownX + (i - 1) * H * 0.04, crownY + 4);
        ctx.rotate(-0.25 + i * 0.25 - swing);
        drawSprite(ctx, sprite, 0, 0);
        ctx.restore();
      });
    }
    for (const f of this.fronds) if (!f.back) frond(f);
  }

  /** Blades are shaded from the soil up to a lit tip; one path per colour. */
  private drawGrass(blades: Blade[], colors: string[], t: number, baseY: number, flexScale: number, maxH: number, night: boolean, ctx = this.ctx) {
    const soil = night ? "#020604" : "#1d4422";
    const light = night ? "#4a6a86" : "#e6f6b0";
    let current = -1;
    let path: Path2D | null = null;
    const flush = () => {
      if (path && current >= 0) {
        const color = colors[current]!;
        const grad = ctx.createLinearGradient(0, baseY - maxH, 0, baseY);
        grad.addColorStop(0, mix(color, light, night ? 0.22 : 0.3));
        grad.addColorStop(0.55, color);
        grad.addColorStop(1, mix(color, soil, 0.6));
        ctx.fillStyle = grad;
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
      const root = baseY + b.dy;
      const tipX = b.x + Math.sin(a) * b.h;
      const tipY = root - Math.cos(a) * b.h;
      const cx = b.x + Math.sin(a * 0.45) * b.h * 0.5;
      const cy = root - b.h * 0.55;
      path!.moveTo(b.x - b.w / 2, root);
      path!.quadraticCurveTo(cx - b.w * 0.3, cy, tipX, tipY);
      path!.quadraticCurveTo(cx + b.w * 0.3, cy, b.x + b.w / 2, root);
    }
    flush();
  }

  /**
   * Each flower grows from the soil when it is earned: the stem rises, its
   * leaves unfold, then the bud swells and opens, petal by petal, over a few
   * seconds. At night most close part-way; jasmine opens and glows.
   */
  private drawFlowers(t: number, night: boolean) {
    const ctx = this.ctx;
    const plants = this.plants;
    if (!plants) return;
    const dpr = this.dpr;
    // translate(x, y) · scale(side, 1) · rotate(r), without save/restore.
    const place = (x: number, y: number, r: number, side = 1) => {
      const c = Math.cos(r) * dpr;
      const s = Math.sin(r) * dpr;
      ctx.setTransform(side * c, s, -side * s, c, x * dpr, y * dpr);
    };
    type Shown = { f: Flower; age: number; a: number; wind: number; stem: number; hx: number; hy: number; mx: number; my: number };
    const shown: Shown[] = [];
    // Stems first, all in two strokes (thin and thick).
    const thin = new Path2D();
    const thick = new Path2D();
    for (const f of this.flowers) {
      const age = f.born < 0 ? 99 : t - f.born;
      const rise = f.born < 0 ? 1 : easeOutBack(clamp01(age / 1.1));
      if (rise <= 0.01) continue;
      const wind = windAt(f.x, t) + this.gustAt(f.x, t);
      const a = f.tilt + wind * 0.22 + Math.sin(t * 1.8 + f.ph) * 0.03;
      const stem = f.stem * Math.min(1, rise);
      const hx = f.x + Math.sin(a) * stem;
      const hy = f.y - Math.cos(a) * stem;
      const mx = f.x + Math.sin(a * 0.4) * stem * 0.5;
      const my = f.y - stem * 0.5;
      const path = f.size > 1.35 ? thick : thin;
      path.moveTo(f.x, f.y);
      path.quadraticCurveTo(mx, my, hx, hy);
      shown.push({ f, age, a, wind, stem, hx, hy, mx, my });
    }
    ctx.strokeStyle = night ? "#0f2a1c" : "#3a7a3a";
    ctx.lineWidth = 1.05;
    ctx.stroke(thin);
    ctx.lineWidth = 1.5;
    ctx.stroke(thick);

    for (const { f, age, a, wind, stem, hx, hy, mx, my } of shown) {
      // Leaves along the stem: serrated for roses, long blades for the rest.
      const leaf = f.kind === "rose" ? plants.roseLeaf : plants.blade;
      if (leaf && f.kind !== "lavender") {
        const unfold = clamp01((age - 0.3) / 1.2);
        const k = (stem / leaf.w) * (f.kind === "rose" ? 0.34 : 0.5) * unfold;
        if (k > 0.02) {
          const pairs = f.kind === "rose" ? 2 : 1;
          for (let i = 0; i < pairs; i++) {
            const u = pairs === 2 ? (i ? 0.62 : 0.38) : 0.3;
            const side = i % 2 ? -f.leaf : f.leaf;
            const lx = (1 - u) * (1 - u) * f.x + 2 * (1 - u) * u * mx + u * u * hx;
            const ly = (1 - u) * (1 - u) * f.y + 2 * (1 - u) * u * my + u * u * hy;
            place(lx, ly, -0.75 + wind * 0.15 * side + (1 - unfold) * -0.8, side);
            drawSprite(ctx, leaf, 0, 0, k);
          }
        }
      }

      const opening = clamp01((age - 0.8) / 2.6);
      let stage = 1 - Math.pow(1 - opening, 2);
      if (night && f.kind !== "jasmine") stage = Math.min(stage, f.kind === "rose" ? 0.62 : 0.55);
      const sprite = this.head(f, stage);
      if (sprite) {
        const pop = f.born < 0 ? 1 : 0.55 + 0.45 * easeOutBack(clamp01((age - 0.6) / 1.4));
        place(hx, hy, a * 0.6);
        drawSprite(ctx, sprite, 0, 0, ((11 * f.size) / HEAD_BASE) * pop);
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (night && this.glow) {
      for (const { f, hx, hy } of shown) {
        if (f.kind !== "jasmine") continue;
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 1.3 + f.ph);
        ctx.drawImage(this.glow, hx - 12, hy - 12, 24, 24);
      }
      ctx.globalAlpha = 1;
    }
  }

  /**
   * The grass nearest the eye is out of focus, as through a camera: drawn at
   * under half the resolution and scaled up, which softens it and costs less.
   */
  private drawNearGrass(colors: string[], t: number, maxH: number, night: boolean) {
    const soft = this.soft;
    const g = this.softCtx;
    const band = Math.ceil(maxH + 14);
    if (!soft || !g) {
      this.drawGrass(this.front, colors, t, this.h + 2, 1, maxH, night);
      return;
    }
    const k = 0.42;
    const sw = Math.max(1, Math.round(this.w * k));
    const sh = Math.max(1, Math.round(band * k));
    if (soft.width !== sw || soft.height !== sh) {
      soft.width = sw;
      soft.height = sh;
    }
    this.softH = band;
    g.setTransform(k, 0, 0, k, 0, -(this.h - band) * k);
    g.clearRect(0, this.h - band, this.w, band);
    this.drawGrass(this.front, colors, t, this.h + 2, 1, maxH, night, g);
    this.ctx.imageSmoothingQuality = "high";
    this.ctx.drawImage(soft, 0, this.h - this.softH, this.w, this.softH);
  }

  /** Pollen and dust turning slowly in the sunlight. */
  private drawMotes(t: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff6d8";
    for (const m of this.motes) {
      const x = m.x + Math.sin(t * m.sp + m.ph) * 26 + t * 4 * m.sp;
      const y = m.y + Math.cos(t * m.sp * 0.7 + m.ph) * 18;
      const xx = ((x % (this.w + 20)) + this.w + 20) % (this.w + 20) - 10;
      ctx.globalAlpha = 0.18 + 0.32 * Math.max(0, Math.sin(t * 0.9 + m.ph));
      ctx.beginPath();
      ctx.arc(xx, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
