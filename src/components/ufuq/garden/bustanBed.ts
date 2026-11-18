/**
 * «بستان الذِّكر» — a bed of real flowers in the foreground of the filmed
 * garden, planted by the day's remembrance.
 *
 * Each flower is a real time-lapse (public/garden/bloom/*.webp, built by
 * tools/garden-footage/bloom_sprites.py): when a remembrance plants one, it
 * opens from bud to full bloom on screen; once open it keeps breathing on its
 * last frames and sways in the breeze. Lilies join the bed after a three-day
 * streak and white peony-roses once the day's Quran wird is done. At night
 * the bed is graded to moonlight.
 */
import { seededRandom } from "@/components/ufuq/garden/gardenMath";

export type BloomKind = "rose-red" | "rose-pink" | "peony-red" | "peony-white" | "lily";
export const BLOOM_KINDS: readonly BloomKind[] = ["rose-red", "rose-pink", "peony-red", "peony-white", "lily"];

const CELL = 200;
const COLS = 6;
const FRAMES = 24;
const BLOOM_SECONDS = 2.6;
const MAX_FLOWERS = 56;
export const BED_BASE = 5;

export type BedState = {
  /** Flowers planted by remembrance today (beyond the bed's own few). */
  planted: number;
  streak: number;
  wirdDone: boolean;
};

/** Which flower the n-th planting is: mostly roses, with the rewards woven in. */
export function bloomKindFor(index: number, state: Pick<BedState, "streak" | "wirdDone">): BloomKind {
  if (state.wirdDone && index % 6 === 4) return "peony-white";
  if (state.streak >= 3 && index % 5 === 2) return "lily";
  if (index % 7 === 6) return "peony-red";
  return index % 2 === 0 ? "rose-red" : "rose-pink";
}

export function bedCount(planted: number): number {
  return Math.min(MAX_FLOWERS, BED_BASE + Math.max(0, Math.round(planted)));
}

type Flower = { x: number; d: number; ph: number; kind: BloomKind; born: number };

export class BustanBed {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bed: HTMLCanvasElement;
  private readonly bctx: CanvasRenderingContext2D;
  private sheets: Partial<Record<BloomKind, HTMLImageElement>> = {};
  private shadow: HTMLCanvasElement | null = null;
  private flowers: Flower[] = [];
  private state: BedState = { planted: 0, streak: 0, wirdDone: false };
  private night = false;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private running = false;
  private last = 0;
  private gust: { x: number; at: number; s: number } | null = null;
  private readonly started = performance.now();

  private constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, bed: HTMLCanvasElement, bctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.bed = bed;
    this.bctx = bctx;
  }

  static create(canvas: HTMLCanvasElement, base: string): BustanBed | null {
    try {
      const ctx = canvas.getContext("2d");
      const bed = document.createElement("canvas");
      const bctx = bed.getContext("2d");
      if (!ctx || !bctx) return null;
      const engine = new BustanBed(canvas, ctx, bed, bctx);
      for (const kind of BLOOM_KINDS) {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          engine.sheets[kind] = img;
          engine.draw();
        };
        img.src = `${base}garden/bloom/${kind}.webp`;
      }
      return engine;
    } catch {
      return null;
    }
  }

  private get t() {
    return (performance.now() - this.started) / 1000;
  }

  /** The bed covers the band of screen it is laid in (w × h). */
  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    for (const c of [this.canvas, this.bed]) {
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(h * this.dpr);
    }
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.layout(false);
    this.draw();
  }

  setNight(night: boolean) {
    this.night = night;
    this.draw();
  }

  setState(next: BedState) {
    const grew = next.planted > this.state.planted;
    const kindsChanged = next.streak !== this.state.streak || next.wirdDone !== this.state.wirdDone;
    this.state = next;
    this.layout(grew && !kindsChanged);
    this.draw();
  }

  /** A touch near the bed sends a breath of wind through it. */
  touch(x: number) {
    this.gust = { x, at: this.t, s: 1 };
  }

  private layout(sprout: boolean) {
    const count = bedCount(this.state.planted);
    const rnd = seededRandom(733 + Math.round(this.w));
    const now = this.t;
    const next: Flower[] = [];
    for (let i = 0; i < count; i++) {
      // Back rows first: depth 0 is the far edge of the bed, 1 the nearest.
      const d = rnd();
      const x = 0.04 + rnd() * 0.92;
      const ph = rnd() * 10;
      const existing = this.flowers[i];
      next.push({
        x,
        d,
        ph,
        kind: bloomKindFor(i, this.state),
        born: existing ? existing.born : sprout && i >= this.flowers.length ? now + (i - this.flowers.length) * 0.35 : -100,
      });
    }
    this.flowers = next;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (ts: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (ts - this.last < 40) return; // the time-lapse plays at 25 frames a second
      this.last = ts;
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.draw(true);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sheets = {};
  }

  private paintShadow() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 32;
    const g = c.getContext("2d");
    if (!g) return null;
    const grad = g.createRadialGradient(64, 16, 2, 64, 16, 64);
    grad.addColorStop(0, "rgba(0,0,0,0.42)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.setTransform(1, 0, 0, 0.25, 0, 12);
    g.fillRect(0, -48, 128, 128);
    return c;
  }

  draw(still = !this.running) {
    const { w, h, bctx, ctx } = this;
    if (!w || !h) return;
    const t = this.t;
    if (!this.shadow) this.shadow = this.paintShadow();
    bctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    bctx.clearRect(0, 0, w, h);

    const order = [...this.flowers].sort((a, b) => a.d - b.d);
    const gust = this.gust && t - this.gust.at < 2.4 ? this.gust : null;
    for (const f of order) {
      const sheet = this.sheets[f.kind];
      if (!sheet) continue;
      const age = t - f.born;
      if (age < 0) continue; // planted, about to sprout
      const size = Math.min(w, 520) * (0.15 + f.d * 0.14);
      const x = f.x * w;
      const y = h * (0.3 + f.d * 0.62);

      let frame: number;
      let grow = 1;
      if (!still && age < BLOOM_SECONDS) {
        frame = Math.min(FRAMES - 1, Math.floor((age / BLOOM_SECONDS) * FRAMES));
        grow = 0.55 + 0.45 * Math.min(1, age / 0.6);
      } else if (still) {
        frame = FRAMES - 1;
      } else {
        // Open, and breathing a little on the last frames of its own bloom.
        const span = 6;
        const p = (t * 2.2 + f.ph) % (span * 2);
        frame = FRAMES - span + Math.floor(p < span ? p : span * 2 - p - 0.001);
      }
      let sway = still ? 0 : Math.sin(t * 0.9 + f.x * 9 + f.ph) * 0.03 + Math.sin(t * 2.1 + f.ph) * 0.008;
      if (gust) {
        const dx = (x - gust.x) / 90;
        sway += Math.exp(-dx * dx) * Math.exp(-(t - gust.at) * 1.6) * Math.sin((t - gust.at) * 7) * 0.12;
      }

      if (this.shadow) {
        bctx.globalAlpha = 0.6 * grow;
        bctx.drawImage(this.shadow, x - size * 0.34, y - size * 0.06, size * 0.68, size * 0.17);
      }
      bctx.globalAlpha = Math.min(1, grow * 1.4);
      bctx.save();
      bctx.translate(x, y);
      bctx.rotate(sway);
      const s = size * grow;
      const col = frame % COLS;
      const row = Math.floor(frame / COLS);
      bctx.drawImage(sheet, col * CELL, row * CELL, CELL, CELL, -s / 2, -s * 0.94, s, s);
      bctx.restore();
    }
    bctx.globalAlpha = 1;

    if (this.night) {
      // Moonlight: the colour drains toward blue, the light falls.
      bctx.globalCompositeOperation = "source-atop";
      bctx.fillStyle = "rgba(8,14,34,0.5)";
      bctx.fillRect(0, 0, w, h);
      bctx.globalCompositeOperation = "source-over";
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.bed, 0, 0);
  }
}
