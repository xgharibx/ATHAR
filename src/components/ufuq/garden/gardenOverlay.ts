/**
 * What is drawn live on top of the garden films: the moon in tonight's real
 * phase (NASA imagery, shaded with a soft terminator) and points of light
 * that behave like the real thing — fireflies at night, drifting motes in
 * the sun by day. Their number grows with the day's remembrance.
 *
 * Small on purpose: everything else is real footage, played by the phone's
 * video decoder.
 */
import { moonIllumination, moonPhase, seededRandom } from "@/components/ufuq/garden/gardenMath";

export type OverlayMode = "day" | "night";

/** Where the moon rides: in open sky the palm fronds never sway into. */
export const MOON_AT = { x: 0.22, y: 0.37, r: 0.068 } as const;

type Light = { x: number; y: number; z: number; ph: number; sp: number; rx: number; ry: number };

export class GardenOverlay {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private mode: OverlayMode;
  private lights: Light[] = [];
  private count = 12;
  private moonImg: HTMLImageElement | null = null;
  private moonSprite: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private raf = 0;
  private running = false;
  private last = 0;
  private push: { x: number; y: number; at: number } | null = null;
  private readonly started = performance.now();

  private constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mode: OverlayMode) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.mode = mode;
  }

  static create(canvas: HTMLCanvasElement, mode: OverlayMode, moonSrc: string): GardenOverlay | null {
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) return null;
    const overlay = new GardenOverlay(canvas, ctx, mode);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      overlay.moonImg = img;
      overlay.moonSprite = null;
      overlay.drawFrame();
    };
    img.src = moonSrc;
    return overlay;
  }

  private get t() {
    return (performance.now() - this.started) / 1000;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.moonSprite = null;
    this.seed();
    this.drawFrame();
  }

  setMode(mode: OverlayMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.seed();
    this.drawFrame();
  }

  /** How many lights: more remembrance, more fireflies. */
  setCount(count: number) {
    this.count = Math.max(4, Math.min(48, Math.round(count)));
    this.drawFrame();
  }

  /** A touch makes the nearest lights drift away from the finger. */
  touch(x: number, y: number) {
    this.push = { x, y, at: this.t };
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (ts: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (ts - this.last < 32) return;
      this.last = ts;
      this.drawFrame();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.drawFrame();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.moonImg = null;
    this.moonSprite = null;
  }

  private seed() {
    const rnd = seededRandom(5 + Math.round(this.w) + Math.round(this.h) * 3 + (this.mode === "night" ? 1 : 2));
    const night = this.mode === "night";
    this.lights = Array.from({ length: 48 }, () => {
      const z = rnd();
      return {
        // Fireflies keep low, among the grasses; motes hang in the lit air.
        x: rnd() * this.w,
        y: night ? this.h * (0.62 + rnd() * 0.34) : this.h * (0.18 + rnd() * 0.6),
        z,
        ph: rnd() * 100,
        sp: 0.12 + rnd() * 0.3,
        rx: 18 + rnd() * 60,
        ry: 8 + rnd() * 26,
      };
    });
  }

  private paintGlow() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    if (!g) return null;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    // A firefly through a lens: a hot core, a soft green-gold bloom.
    grad.addColorStop(0, "rgba(255,252,214,1)");
    grad.addColorStop(0.12, "rgba(235,255,160,0.85)");
    grad.addColorStop(0.35, "rgba(190,240,120,0.28)");
    grad.addColorStop(1, "rgba(160,220,110,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  /** The NASA moon, shaded to tonight's phase with a soft terminator and earthshine. */
  private paintMoon(): HTMLCanvasElement | null {
    const img = this.moonImg;
    if (!img) return null;
    const r = Math.max(22, Math.min(46, this.w * MOON_AT.r));
    const pad = r * 3.4;
    const size = Math.ceil((r + pad) * 2);
    const c = document.createElement("canvas");
    c.width = c.height = Math.round(size * this.dpr);
    const g = c.getContext("2d");
    if (!g) return null;
    g.scale(this.dpr, this.dpr);
    const cx = size / 2;
    const phase = moonPhase(new Date());
    const lit = moonIllumination(phase);

    // Atmospheric halo, stronger the fuller the moon.
    const halo = g.createRadialGradient(cx, cx, r * 0.9, cx, cx, r + pad);
    halo.addColorStop(0, `rgba(210,222,255,${0.06 + lit * 0.2})`);
    halo.addColorStop(0.35, `rgba(190,205,250,${0.02 + lit * 0.06})`);
    halo.addColorStop(1, "rgba(190,205,250,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);

    // The surface itself.
    g.save();
    g.beginPath();
    g.arc(cx, cx, r, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, cx - r, cx - r, r * 2, r * 2);

    // Night side: a shadow whose edge follows the terminator. The lit limb
    // is on the right while waxing (as seen from the northern hemisphere).
    const shade = document.createElement("canvas");
    shade.width = shade.height = Math.ceil(r * 2 * this.dpr);
    const s = shade.getContext("2d");
    if (s) {
      s.scale(this.dpr, this.dpr);
      s.translate(r, r);
      if (phase >= 0.5) s.scale(-1, 1);
      // Start fully dark, then cut the lit part out with a feathered edge.
      s.fillStyle = "rgba(6,9,18,0.94)";
      s.fillRect(-r, -r, r * 2, r * 2);
      s.globalCompositeOperation = "destination-out";
      s.filter = `blur(${Math.max(1, r * 0.06)}px)`;
      const rx = r * Math.abs(Math.cos(2 * Math.PI * phase));
      s.beginPath();
      s.arc(0, 0, r * 1.02, -Math.PI / 2, Math.PI / 2, false);
      s.ellipse(0, 0, rx, r * 1.02, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5);
      s.closePath();
      if (lit > 0.01) s.fill();
    }
    g.drawImage(shade, cx - r, cx - r, r * 2, r * 2);
    // Earthshine: the dark side is never quite black.
    g.globalCompositeOperation = "screen";
    g.fillStyle = "rgba(40,52,80,0.10)";
    g.fillRect(cx - r, cx - r, r * 2, r * 2);
    g.restore();
    return c;
  }

  drawFrame() {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    const t = this.t;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const night = this.mode === "night";

    if (night) {
      if (!this.moonSprite) this.moonSprite = this.paintMoon();
      const sprite = this.moonSprite;
      if (sprite) {
        const size = sprite.width / this.dpr;
        ctx.drawImage(sprite, w * MOON_AT.x - size / 2, h * MOON_AT.y - size / 2, size, size);
      }
    }

    if (!this.glow) this.glow = this.paintGlow();
    const glow = this.glow;
    if (!glow) return;
    const push = this.push && t - this.push.at < 3 ? this.push : null;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.count && i < this.lights.length; i++) {
      const L = this.lights[i]!;
      let x = L.x + Math.sin(t * L.sp + L.ph) * L.rx + Math.sin(t * L.sp * 2.7 + L.ph * 2) * 6;
      let y = L.y + Math.cos(t * L.sp * 1.4 + L.ph) * L.ry;
      if (push) {
        const dx = x - push.x;
        const dy = y - push.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.max(0, 1 - d / 160) * Math.exp(-(t - push.at) * 1.2) * 70;
        x += (dx / d) * k;
        y += (dy / d) * k;
      }
      if (night) {
        // Fireflies: slow pulses, some near (large, soft) some far (small, sharp).
        const pulse = Math.max(0, Math.sin(t * (0.9 + L.sp) + L.ph * 3));
        const size = 8 + L.z * 22;
        ctx.globalAlpha = (0.08 + pulse * 0.92) * (0.55 + (1 - L.z) * 0.45);
        ctx.drawImage(glow, x - size / 2, y - size / 2, size, size);
      } else {
        // Motes in the sun: faint, warm, drifting.
        const size = 2 + L.z * 5;
        ctx.globalAlpha = 0.18 + 0.22 * Math.sin(t * 0.7 + L.ph) ** 2;
        ctx.drawImage(glow, x - size / 2, y - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}
