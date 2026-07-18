// @vitest-environment jsdom
/**
 * tests/ayahPoster.test.ts
 *
 * Architectural contract tests for the new customizable ayah-share poster
 * library. Uses the same jsdom canvas-shim pattern as the dhikr poster
 * tests so we don't need a real browser to verify the pipeline.
 */
import { describe, expect, it, beforeAll } from "vitest";
import {
  renderAyahPosterBlob,
  AYAH_BACKGROUND_OPTIONS,
  AYAH_FONT_OPTIONS,
  AYAH_COLOR_OPTIONS,
  AYAH_REFERENCE_OPTIONS,
  type AyahPosterConfig,
} from "@/lib/ayahPoster";

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
  texts = 0;
  arcs = 0;
  saveRestore = 0;
  constructor(canvas: any) { this.canvas = canvas; }
  save() { this.saveRestore++; }
  restore() { this.saveRestore++; }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() { this.arcs++; }
  arcTo() {}
  bezierCurveTo() {}
  fill() {}
  stroke() {}
  fillRect() {}
  fillText(_t: string, _x: number, _y: number) { this.texts++; }
  measureText(s: string) { return { width: s.length * 6 }; }
  createLinearGradient() { return { addColorStop() {} } as any; }
  createRadialGradient() { return { addColorStop() {} } as any; }
  setTransform() {}
  clearRect() {}
  translate() {}
  rotate() {}
  scale() {}
  drawImage() {}
  clip() {}
  saveRestore() {}
}

describe("ayahPoster — composition contract", () => {
  let lastCtx: ShimCtx | null = null;

  beforeAll(() => {
    document.documentElement.style.setProperty("--bg", "#0a0a0e");
    document.documentElement.style.setProperty("--fg", "#f5efe2");
    document.documentElement.style.setProperty("--accent", "#d8a657");
    document.documentElement.style.setProperty("--accent-2", "#caa065");

    const proto = (globalThis as any).HTMLCanvasElement.prototype;
    proto.getContext = function (_kind: string) {
      const ctx = new ShimCtx(this);
      lastCtx = ctx;
      return ctx as any;
    };
    proto.toBlob = function (cb: (b: Blob | null) => void, mime: string) {
      const w = this.width, h = this.height;
      const ibuf = new ArrayBuffer(8 + 25);
      const v = new Uint8Array(ibuf);
      v.set([137, 80, 78, 71, 13, 10, 26, 10]);
      v[8] = 0; v[9] = 0; v[10] = 0; v[11] = 13;
      v[12] = 73; v[13] = 72; v[14] = 68; v[15] = 82;
      v[16] = (w >> 24) & 0xff; v[17] = (w >> 16) & 0xff;
      v[18] = (w >> 8) & 0xff; v[19] = w & 0xff;
      v[20] = (h >> 24) & 0xff; v[21] = (h >> 16) & 0xff;
      v[22] = (h >> 8) & 0xff; v[23] = h & 0xff;
      v[24] = 8; v[25] = 2; v[26] = 0; v[27] = 0; v[28] = 0;
      const blob = new Blob([ibuf], { type: mime });
      setTimeout(() => cb(blob), 0);
    };

    if (!document.fonts) {
      (document as any).fonts = {
        load: () => Promise.resolve([]),
        ready: Promise.resolve(),
      };
    }
  });

  it("resolves with a real PNG Blob of 1080×1350", async () => {
    const blob = await renderAyahPosterBlob({
      text: "لَا إِلَٰهَ إِلَّا اللَّهُ",
      ayahNumber: 255,
      surahName: "البقرة",
      surahNumber: 2,
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
    const ab = await blob.arrayBuffer();
    const view = new Uint8Array(ab);
    const w = (view[16] << 24) | (view[17] << 16) | (view[18] << 8) | view[19];
    const h = (view[20] << 24) | (view[21] << 16) | (view[22] << 8) | view[23];
    expect(w).toBe(1080);
    expect(h).toBe(1350);
  });

  it("renders without error for every background / font / color combo", async () => {
    for (const bg of AYAH_BACKGROUND_OPTIONS) {
      for (const fnt of AYAH_FONT_OPTIONS) {
        for (const color of AYAH_COLOR_OPTIONS) {
          await expect(
            renderAyahPosterBlob({
              text: "نَصّ اختباري",
              ayahNumber: 1,
              surahName: "سورة",
              surahNumber: 1,
              translation: "test translation",
              background: bg.id,
              font: fnt.id,
              colorTheme: color.id,
              referenceStyle: "surahAyah",
            }),
          ).resolves.toBeInstanceOf(Blob);
        }
      }
    }
  });

  it("honours showTranslation — extra fillText when on", async () => {
    const base: AyahPosterConfig = {
      text: "أَقُولُ هُوَ اللَّهُ أَحَدٌ",
      ayahNumber: 1,
      surahName: "الإخلاص",
      surahNumber: 112,
      background: "celestial",
    };
    lastCtx = null;
    await renderAyahPosterBlob({ ...base, showTranslation: false });
    const off = lastCtx!.texts;
    lastCtx = null;
    await renderAyahPosterBlob({
      ...base,
      showTranslation: true,
      translation: "Say: He is Allah, the One",
    });
    const on = lastCtx!.texts;
    expect(on).toBeGreaterThan(off);
  });

  it("honours textScale — produces larger text without extra draw calls", async () => {
    const base: AyahPosterConfig = {
      text: "السَّمَاءُ فَوْقَكُمْ",
      ayahNumber: 1,
      surahName: "سورة",
      background: "minimal",
      font: "amiri",
    };
    lastCtx = null;
    await renderAyahPosterBlob({ ...base, textScale: 0.7 });
    const small = lastCtx!.texts;
    lastCtx = null;
    await renderAyahPosterBlob({ ...base, textScale: 1.4 });
    const big = lastCtx!.texts;
    // Same number of lines — only the size differs.
    expect(Math.abs(big - small)).toBeLessThanOrEqual(1);
  });

  it("every background variant calls fillText at least once (verse draws)", async () => {
    for (const bg of AYAH_BACKGROUND_OPTIONS) {
      lastCtx = null;
      await renderAyahPosterBlob({
        text: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
        ayahNumber: 1,
        surahName: "العلق",
        surahNumber: 96,
        background: bg.id,
      });
      expect(lastCtx!.texts, bg.id).toBeGreaterThan(1);
    }
  });
});
