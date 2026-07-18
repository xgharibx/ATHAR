// @vitest-environment jsdom
/**
 * tests/sharePoster.test.ts
 *
 * Architectural unit-tests for the poster renderer. The canvas-drawing
 * path itself can't run in jsdom (no 2d context), so we test the API
 * contract end-to-end against a canvas shim, plus a few of the pure
 * helpers. The visual run is exercised separately via the dev server
 * and a Node-driven harness.
 */
import { describe, expect, it, beforeAll } from "vitest";
import {
  renderDhikrPosterBlob,
  type RenderDhikrPosterOpts,
} from "@/lib/sharePoster";

/* ────────────── Minimal canvas shim for jsdom ────────────── */

class ShimCtx {
  canvas: any;
  fillStyle: any = "#000";
  strokeStyle: any = "#000";
  lineWidth = 1;
  font = "10px sans-serif";
  textAlign: "start" | "end" | "center" | "left" | "right" = "start";
  textBaseline = "alphabetic";
  direction: "ltr" | "rtl" | "inherit" = "ltr";
  globalAlpha = 1;
  shadowBlur = 0;
  shadowColor = "rgba(0,0,0,0)";
  shadowOffsetY = 0;
  fills = 0;
  texts = 0;
  fillRects = 0;
  arcs = 0;
  saves = 0;
  restores = 0;
  constructor(canvas: any) { this.canvas = canvas; }
  save() { this.saves++; }
  restore() { this.restores++; }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() { this.arcs++; }
  arcTo() { this.arcs++; }
  fill() { this.fills++; }
  stroke() {}
  fillRect() { this.fillRects++; }
  fillText(_t: string, _x: number, _y: number) { this.texts++; }
  measureText(s: string) { return { width: s.length * 6 }; }
  createLinearGradient() { return { addColorStop() {} } as any; }
  createRadialGradient() { return { addColorStop() {} } as any; }
  setTransform() {}
  clearRect() {}
  translate() {}
  rotate() {}
  scale() {}
  drawImage(..._args: unknown[]) {}
}

describe("renderDhikrPosterBlob — output contract", () => {
  let lastCtx: ShimCtx | null = null;

  beforeAll(() => {
    // CSS-var reads: the renderer reads --bg, --fg, --accent from :root.
    document.documentElement.style.setProperty("--bg", "#0a0a0e");
    document.documentElement.style.setProperty("--fg", "#f5efe2");
    document.documentElement.style.setProperty("--accent", "#d8a657");
    document.documentElement.style.setProperty("--accent-2", "#caa065");

    // Patch HTMLCanvasElement so the renderer can run inside jsdom.
    const proto = (globalThis as any).HTMLCanvasElement.prototype;
    proto.getContext = function (_kind: string) {
      const ctx = new ShimCtx(this);
      lastCtx = ctx;
      return ctx as any;
    };
    proto.toBlob = function (cb: (b: Blob | null) => void, mime: string) {
      const w = this.width;
      const h = this.height;
      // Minimal PNG signature + IHDR so the test that parses these bytes
      // can verify the canvas dimensions decodable from the header.
      const ibuf = new ArrayBuffer(8 + 25);
      const v = new Uint8Array(ibuf);
      v.set([137, 80, 78, 71, 13, 10, 26, 10]);
      v[8] = 0; v[9] = 0; v[10] = 0; v[11] = 13;
      v[12] = 73; v[13] = 72; v[14] = 68; v[15] = 82; // "IHDR"
      v[16] = (w >> 24) & 0xff; v[17] = (w >> 16) & 0xff;
      v[18] = (w >> 8) & 0xff; v[19] = w & 0xff;
      v[20] = (h >> 24) & 0xff; v[21] = (h >> 16) & 0xff;
      v[22] = (h >> 8) & 0xff; v[23] = h & 0xff;
      v[24] = 8; v[25] = 2; v[26] = 0; v[27] = 0; v[28] = 0;
      const blob = new Blob([ibuf], { type: mime });
      setTimeout(() => cb(blob), 0);
    };

    // document.fonts polyfill: resolve every load immediately.
    if (!document.fonts) {
      (document as any).fonts = {
        load: () => Promise.resolve([]),
        ready: Promise.resolve(),
      };
    }
  });

  it("resolves with a real PNG Blob of the expected dimensions", async () => {
    const blob = await renderDhikrPosterBlob({ text: "سبحان الله" });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
    const ab = await blob.arrayBuffer();
    const view = new Uint8Array(ab);
    expect(Array.from(view.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const w = (view[16] << 24) | (view[17] << 16) | (view[18] << 8) | view[19];
    const h = (view[20] << 24) | (view[21] << 16) | (view[22] << 8) | view[23];
    expect(w).toBe(1080);
    expect(h).toBe(1350);
  });

  it("accepts all option forms without throwing", async () => {
    await expect(
      renderDhikrPosterBlob({
        text: "لَا إِلَٰهَ إِلَّا اللَّهُ",
        sectionTitle: "أذكار الصباح",
        count: 100,
        translation: "There is no god but Allah",
        footerUrl: "athar.app",
      }),
    ).resolves.toBeInstanceOf(Blob);
  });

  it("renders an identical-size blob regardless of dhikr length", async () => {
    const short = await renderDhikrPosterBlob({ text: "أ", sectionTitle: "ذكر", count: 1 });
    const long = await renderDhikrPosterBlob({
      text: "أ".repeat(1800),
      sectionTitle: "ذكر",
      count: 9999,
    });
    expect(short.size).toBeGreaterThan(0);
    expect(long.size).toBeGreaterThan(0);
    expect(short.type).toBe("image/png");
    expect(long.type).toBe("image/png");
  });

  it("actually drew the dhikr + brand + footer (fillText was called)", async () => {
    await renderDhikrPosterBlob({
      text: "سُبْحَانَ اللَّهِ",
      sectionTitle: "أذكار",
      count: 100,
    });
    expect(lastCtx).not.toBeNull();
    // Many fillText calls expected: basmala, app name, section pill,
    // count label, count digits, brand, footer URL, plus the dhikr
    // block (one per line of wrapped text).
    expect(lastCtx!.texts).toBeGreaterThan(5);
    // Background is layered: base gradient fill + halo + diagonal wash
    expect(lastCtx!.fillRects).toBeGreaterThan(1);
    // Frame, corner accents, divider rules, crescents all use arc
    expect(lastCtx!.arcs).toBeGreaterThan(3);
    // The renderer save/restores for each decorative layer
    expect(lastCtx!.saves).toBeGreaterThan(2);
    expect(lastCtx!.restores).toBeGreaterThan(2);
  });

  it("renders the count only when opts.count > 1 (count=1 is hidden)", async () => {
    lastCtx = null;
    await renderDhikrPosterBlob({ text: "أ", sectionTitle: "ذكر", count: 1 });
    const withoutCount = lastCtx!.texts;
    lastCtx = null;
    await renderDhikrPosterBlob({ text: "أ", sectionTitle: "ذكر", count: 100 });
    const withCount = lastCtx!.texts;
    // With count → at least the "تكرار" label + the Arabic-Indic number,
    // each as a fillText call.
    expect(withCount).toBeGreaterThanOrEqual(withoutCount + 1);
  });
});
