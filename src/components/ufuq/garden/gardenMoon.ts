/**
 * The Moon of «الحديقة», drawn inside the filmed scene rather than over it.
 *
 * It rides in the band of sky the palm fronds sweep across, and on every
 * frame of the film it reads the film's own pixels around itself: wherever
 * a frond passes (near-black against the night), the Moon and its glow are
 * hidden behind it. So the fronds cross in front of the Moon, as they would
 * on a real night under palms.
 *
 * The surface is NASA's (Scientific Visualization Studio), shaded to
 * tonight's real phase with a soft terminator and earthshine.
 */
import { moonIllumination, moonPhase } from "@/components/ufuq/garden/gardenMath";

/** Size of the night film, and where the Moon sits in it (fractions). */
export const FILM_SIZE = { w: 864, h: 1536 } as const;
export const MOON_IN_FILM = { x: 0.3, y: 0.185 } as const;

type Media = HTMLVideoElement | HTMLImageElement;

function mediaSize(media: Media): { w: number; h: number } {
  if (media instanceof HTMLVideoElement) return { w: media.videoWidth || FILM_SIZE.w, h: media.videoHeight || FILM_SIZE.h };
  return { w: media.naturalWidth || FILM_SIZE.w, h: media.naturalHeight || FILM_SIZE.h };
}

export class MoonLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sample: HTMLCanvasElement;
  private readonly sctx: CanvasRenderingContext2D;
  private readonly mask: HTMLCanvasElement;
  private readonly mctx: CanvasRenderingContext2D;
  private moonImg: HTMLImageElement | null = null;
  private sprite: HTMLCanvasElement | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private r = 20;
  private R = 64;
  private cx = 0;
  private cy = 0;
  private visible = true;

  private constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    sample: HTMLCanvasElement,
    sctx: CanvasRenderingContext2D,
    mask: HTMLCanvasElement,
    mctx: CanvasRenderingContext2D,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.sample = sample;
    this.sctx = sctx;
    this.mask = mask;
    this.mctx = mctx;
  }

  static create(canvas: HTMLCanvasElement, moonSrc: string, onReady: () => void): MoonLayer | null {
    try {
      const ctx = canvas.getContext("2d");
      const sample = document.createElement("canvas");
      const sctx = sample.getContext("2d", { willReadFrequently: true });
      const mask = document.createElement("canvas");
      const mctx = mask.getContext("2d");
      if (!ctx || !sctx || !mctx) return null;
      const layer = new MoonLayer(canvas, ctx, sample, sctx, mask, mctx);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        layer.moonImg = img;
        layer.sprite = null;
        onReady();
      };
      img.src = moonSrc;
      return layer;
    } catch {
      return null;
    }
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) this.clear();
  }

  /** Where the Moon falls on screen for a scene of w×h shown with object-fit: cover, top-anchored. */
  layout(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const s = Math.max(w / FILM_SIZE.w, h / FILM_SIZE.h);
    const offX = (w - FILM_SIZE.w * s) / 2;
    this.cx = offX + MOON_IN_FILM.x * FILM_SIZE.w * s;
    this.cy = MOON_IN_FILM.y * FILM_SIZE.h * s;
    // A real moon is small in a wide night shot; its glow is what carries.
    this.r = Math.max(15, Math.min(30, w * 0.046));
    this.R = Math.ceil(this.r * 3.4);
    const side = this.R * 2;
    this.sample.width = this.sample.height = side;
    this.mask.width = this.mask.height = side;
    this.sprite = null;
  }

  private clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private paintSprite(): HTMLCanvasElement | null {
    const img = this.moonImg;
    if (!img) return null;
    const { r, R } = this;
    const side = R * 2;
    const c = document.createElement("canvas");
    c.width = c.height = Math.round(side * this.dpr);
    const g = c.getContext("2d");
    if (!g) return null;
    g.scale(this.dpr, this.dpr);
    const phase = moonPhase(new Date());
    const lit = moonIllumination(phase);

    // Glow in the air around it, brighter the fuller it is.
    const halo = g.createRadialGradient(R, R, r * 0.9, R, R, R);
    halo.addColorStop(0, `rgba(214,224,255,${0.1 + lit * 0.32})`);
    halo.addColorStop(0.3, `rgba(196,210,250,${0.03 + lit * 0.1})`);
    halo.addColorStop(1, "rgba(190,205,250,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, side, side);

    g.save();
    g.beginPath();
    g.arc(R, R, r, 0, Math.PI * 2);
    g.clip();
    g.drawImage(img, R - r, R - r, r * 2, r * 2);
    // The night side, with a feathered terminator (lit limb on the right
    // while waxing, as seen from the northern hemisphere).
    const shade = document.createElement("canvas");
    shade.width = shade.height = Math.ceil(r * 2 * this.dpr);
    const s = shade.getContext("2d");
    if (s) {
      s.scale(this.dpr, this.dpr);
      s.translate(r, r);
      if (phase >= 0.5) s.scale(-1, 1);
      s.fillStyle = "rgba(6,9,18,0.95)";
      s.fillRect(-r, -r, r * 2, r * 2);
      s.globalCompositeOperation = "destination-out";
      s.filter = `blur(${Math.max(0.8, r * 0.07)}px)`;
      const rx = r * Math.abs(Math.cos(2 * Math.PI * phase));
      s.beginPath();
      s.arc(0, 0, r * 1.03, -Math.PI / 2, Math.PI / 2, false);
      s.ellipse(0, 0, rx, r * 1.03, 0, Math.PI / 2, -Math.PI / 2, lit < 0.5);
      s.closePath();
      if (lit > 0.01) s.fill();
    }
    g.drawImage(shade, R - r, R - r, r * 2, r * 2);
    // Earthshine: the dark side is never quite black.
    g.globalCompositeOperation = "screen";
    g.fillStyle = "rgba(40,52,82,0.12)";
    g.fillRect(R - r, R - r, r * 2, r * 2);
    g.restore();
    return c;
  }

  /** Draw the Moon behind whatever of the film covers it in this frame. */
  draw(media: Media | null) {
    if (!this.visible || !this.w) return;
    if (!this.sprite) this.sprite = this.paintSprite();
    const sprite = this.sprite;
    if (!sprite) return;
    const { ctx, R, cx, cy } = this;
    const side = R * 2;

    let masked = false;
    if (media) {
      try {
        const { w: mw, h: mh } = mediaSize(media);
        const s = Math.max(this.w / mw, this.h / mh);
        const offX = (this.w - mw * s) / 2;
        const sx = (cx - R - offX) / s;
        const sy = (cy - R) / s;
        this.sctx.drawImage(media, sx, sy, side / s, side / s, 0, 0, side, side);
        const frame = this.sctx.getImageData(0, 0, side, side);
        const px = frame.data;
        // Fronds are near-black against the night; sky and stars are not.
        for (let i = 0; i < px.length; i += 4) {
          const lum = px[i]! * 0.299 + px[i + 1]! * 0.587 + px[i + 2]! * 0.114;
          const a = Math.max(0, Math.min(1, (lum - 7) / 13));
          px[i] = px[i + 1] = px[i + 2] = 255;
          px[i + 3] = a * 255;
        }
        this.mctx.putImageData(frame, 0, 0);
        masked = true;
      } catch {
        masked = false;
      }
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(sprite, cx - R, cy - R, side, side);
    if (masked) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(this.mask, cx - R, cy - R, side, side);
      ctx.globalCompositeOperation = "source-over";
    }
  }
}
