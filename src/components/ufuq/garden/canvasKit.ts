/**
 * Canvases that work both in the page and in a Web Worker, so the garden can
 * be drawn off the main thread (gardenWorker.ts) and taps never wait on it.
 */
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function newCanvas(w: number, h: number): AnyCanvas {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c;
  }
  return new OffscreenCanvas(width, height);
}

export function context2d(canvas: AnyCanvas, options?: CanvasRenderingContext2DSettings): Ctx2D | null {
  return (canvas as HTMLCanvasElement).getContext("2d", options) as Ctx2D | null;
}

type FrameCallback = (time: number) => void;

/** requestAnimationFrame where it exists (the page, and workers in modern browsers), a timer otherwise. */
export function requestFrame(cb: FrameCallback): number {
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame(cb);
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
}

export function cancelFrame(id: number): void {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id);
  else clearTimeout(id);
}
