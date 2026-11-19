/// <reference lib="webworker" />
/**
 * The garden, drawn in a Web Worker: the page's thread stays free for taps,
 * scrolling and navigation while the palm sways and the flowers open.
 */
import { GardenEngine, type GardenOptions } from "@/components/ufuq/garden/GardenEngine";

export type GardenMessage =
  | { type: "init"; bg: OffscreenCanvas; fg: OffscreenCanvas; opts: GardenOptions; w: number; h: number; dpr: number }
  | { type: "resize"; w: number; h: number; dpr: number }
  | { type: "options"; opts: Partial<GardenOptions> }
  | { type: "scroll"; y: number }
  | { type: "poke"; x: number; strength: number }
  | { type: "start" }
  | { type: "stop" }
  | { type: "destroy" };

let engine: GardenEngine | null = null;

self.onmessage = (event: MessageEvent<GardenMessage>) => {
  const m = event.data;
  switch (m.type) {
    case "init":
      engine = GardenEngine.create(m.bg, m.fg, m.opts);
      engine?.resize(m.w, m.h, m.dpr);
      engine?.start();
      break;
    case "resize":
      engine?.resize(m.w, m.h, m.dpr);
      break;
    case "options":
      engine?.setOptions(m.opts);
      break;
    case "scroll":
      engine?.setScroll(m.y);
      break;
    case "poke":
      engine?.poke(m.x, m.strength);
      break;
    case "start":
      engine?.start();
      break;
    case "stop":
      engine?.stop();
      break;
    case "destroy":
      engine?.destroy();
      engine = null;
      self.close();
      break;
  }
};
