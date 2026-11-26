/**
 * Runs the garden where it costs the page least: in a Web Worker with an
 * OffscreenCanvas (iOS 16.4+, Android's WebView, modern browsers), or in the
 * page itself where that is not available. Same garden either way.
 */
import { GardenEngine, type GardenOptions } from "@/components/ufuq/garden/GardenEngine";
import type { GardenMessage } from "@/components/ufuq/garden/gardenWorker";
import { canDrawOffThread, takeGardenWorker } from "@/components/ufuq/garden/gardenWarm";

export type GardenController = {
  readonly offThread: boolean;
  resize(w: number, h: number): void;
  setOptions(opts: Partial<GardenOptions>): void;
  setScroll(y: number): void;
  poke(x: number, strength: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
};

function dpr(): number {
  return globalThis.devicePixelRatio || 1;
}

export function createGardenController(bg: HTMLCanvasElement, fg: HTMLCanvasElement, opts: GardenOptions, w: number, h: number): GardenController | null {
  if (canDrawOffThread()) {
    try {
      const worker = takeGardenWorker();
      const bgOff = bg.transferControlToOffscreen();
      const fgOff = fg.transferControlToOffscreen();
      const send = (m: GardenMessage, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
      send({ type: "init", bg: bgOff, fg: fgOff, opts, w, h, dpr: dpr() }, [bgOff, fgOff]);
      // Scroll arrives often; one message a frame is plenty.
      let pendingScroll: number | null = null;
      return {
        offThread: true,
        resize: (nw, nh) => send({ type: "resize", w: nw, h: nh, dpr: dpr() }),
        setOptions: (o) => send({ type: "options", opts: o }),
        setScroll: (y) => {
          if (pendingScroll === null) {
            requestAnimationFrame(() => {
              if (pendingScroll !== null) send({ type: "scroll", y: pendingScroll });
              pendingScroll = null;
            });
          }
          pendingScroll = y;
        },
        poke: (x, strength) => send({ type: "poke", x, strength }),
        start: () => send({ type: "start" }),
        stop: () => send({ type: "stop" }),
        destroy: () => {
          send({ type: "destroy" });
          window.setTimeout(() => worker.terminate(), 200);
        },
      };
    } catch {
      // Fall through to drawing in the page.
    }
  }
  const engine = GardenEngine.create(bg, fg, opts);
  if (!engine) return null;
  engine.resize(w, h);
  engine.start();
  return {
    offThread: false,
    resize: (nw, nh) => engine.resize(nw, nh),
    setOptions: (o) => engine.setOptions(o),
    setScroll: (y) => engine.setScroll(y),
    poke: (x, strength) => engine.poke(x, strength),
    start: () => engine.start(),
    stop: () => engine.stop(),
    destroy: () => engine.destroy(),
  };
}
