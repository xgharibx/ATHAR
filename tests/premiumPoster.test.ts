// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  arabicDigits,
  drawPremiumPoster,
  POSTER_FORMATS,
  POSTER_THEMES,
  renderPremiumPoster,
  timesLabel,
  type PosterContent,
} from "@/lib/premiumPoster";

class ShimCtx {
  fillStyle: unknown = "#000";
  strokeStyle: unknown = "#000";
  lineWidth = 1;
  font = "10px serif";
  textAlign = "start";
  textBaseline = "alphabetic";
  direction = "ltr";
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  shadowBlur = 0;
  shadowColor = "transparent";
  shadowOffsetY = 0;
  texts: Array<{ text: string; direction: string; font: string }> = [];
  constructor(public canvas: HTMLCanvasElement) {}
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  arcTo() {}
  fill() {}
  stroke() {}
  fillRect() {}
  drawImage() {}
  fillText(text: string) { this.texts.push({ text, direction: this.direction, font: this.font }); }
  measureText(text: string) {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
    return { width: text.length * size * 0.5 };
  }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
}

let contexts: ShimCtx[] = [];

beforeAll(() => {
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: (kind: string) => unknown;
    toBlob: (cb: (blob: Blob | null) => void, mime: string) => void;
  };
  proto.getContext = function (this: HTMLCanvasElement) {
    const ctx = new ShimCtx(this);
    contexts.push(ctx);
    return ctx;
  };
  proto.toBlob = function (this: HTMLCanvasElement, cb, mime) {
    cb(new Blob([`${this.width}x${this.height}`], { type: mime }));
  };
});

/** The main canvas's context (the first one made for a poster). */
function draw(content: PosterContent, style = {}) {
  contexts = [];
  const canvas = drawPremiumPoster(content, style);
  return { canvas, ctx: contexts[0], texts: contexts[0].texts.map((t) => t.text) };
}

const LONG_AYAH = Array.from({ length: 70 }, () => "ٱلسَّمَٰوَٰتِ").join(" ");

describe("premium share image", () => {
  it("draws a post, a story and a square at their sizes", async () => {
    for (const format of POSTER_FORMATS) {
      const { canvas } = draw({ kind: "ayah", text: "أَلَا بِذِكۡرِ ٱللَّهِ", ayahNumber: 28, heading: "سورة الرعد" }, { format: format.id });
      expect([canvas.width, canvas.height]).toEqual([format.width, format.height]);
    }
    const blob = await renderPremiumPoster({ kind: "dhikr", text: "سبحان الله" }, { format: "story" });
    expect(blob.type).toBe("image/png");
    expect(await blob.text()).toBe("1080x1920");
  });

  it("renders every palette", () => {
    for (const theme of POSTER_THEMES) {
      const { texts } = draw({ kind: "dhikr", text: "الحمد لله", heading: "أذكار المساء", count: 33 }, { theme: theme.id });
      expect(texts).toContain("الحمد لله");
      expect(texts).toContain("أذكار المساء");
    }
  });

  it("never drops the translation, even for a very long ayah", () => {
    const translation = "In the name of Allah, the Entirely Merciful, the Especially Merciful.";
    const { texts } = draw({ kind: "ayah", text: LONG_AYAH, ayahNumber: 282, translation, translationAttribution: "Saheeh International" });
    expect(texts.some((t) => t.startsWith("In the name"))).toBe(true);
    expect(texts).toContain("Saheeh International");
    // And the whole ayah is drawn: no word is cut.
    const drawnWords = texts.join(" ").split(" ").filter((w) => w === "ٱلسَّمَٰوَٰتِ").length;
    expect(drawnWords).toBe(70);
  });

  it("can hide the translation", () => {
    const { texts } = draw({ kind: "ayah", text: "قُلۡ هُوَ ٱللَّهُ أَحَدٌ", ayahNumber: 1, translation: "Say, He is Allah, One." }, { showTranslation: false });
    expect(texts.some((t) => t.includes("Say"))).toBe(false);
  });

  it("writes an Urdu translation right to left", () => {
    contexts = [];
    drawPremiumPoster({ kind: "ayah", text: "قُلۡ هُوَ ٱللَّهُ أَحَدٌ", translation: "کہو وہ اللہ ایک ہے", translationDirection: "rtl" });
    const line = contexts[0].texts.find((t) => t.text.includes("اللہ"));
    expect(line?.direction).toBe("rtl");
  });

  it("closes an ayah with its number in Arabic digits, and writes references in Arabic digits", () => {
    expect(draw({ kind: "ayah", text: "قُلۡ هُوَ ٱللَّهُ أَحَدٌ", ayahNumber: 255 }).texts).toContain("٢٥٥");
    expect(draw({ kind: "hadith", text: "إنما الأعمال بالنيات", heading: "صحيح البخاري", reference: "حديث 1", grade: "صحيح" }).texts)
      .toContain("حديث ١  ·  صحيح");
  });

  it("shows how many times a dhikr is said, only when more than once", () => {
    expect(timesLabel(1)).toBe("");
    expect(timesLabel(2)).toBe("مرتان");
    expect(timesLabel(7)).toBe("٧ مرات");
    expect(timesLabel(100)).toBe("١٠٠ مرة");
    expect(draw({ kind: "dhikr", text: "سبحان الله", count: 100 }).texts).toContain("١٠٠ مرة");
    expect(draw({ kind: "dhikr", text: "سبحان الله", count: 1 }).texts.some((t) => t.includes("مرة"))).toBe(false);
    expect(arabicDigits("13:28")).toBe("١٣:٢٨");
  });

  it("quotes the verse above a reflection, and signs every image with the real address", () => {
    const { texts } = draw({ kind: "reflection", text: "الطمأنينة في ذكر الله", quote: "أَلَا بِذِكۡرِ ٱللَّهِ تَطۡمَئِنُّ ٱلۡقُلُوبُ" });
    expect(texts.some((t) => t.startsWith("﴿"))).toBe(true);
    expect(texts).toContain("athark.org");
    expect(draw({ kind: "dhikr", text: "سبحان الله" }, { footerUrl: "https://www.athark.org" }).texts).toContain("athark.org");
  });
});

describe("where images are shared from", () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

  it("uses the premium design for ayah, dhikr, hadith and reflection images", () => {
    const mushaf = read("src/pages/Mushaf.tsx");
    expect(mushaf).toContain("<PremiumShareComposer");
    expect(mushaf).toContain('kind: "ayah"');
    expect(mushaf).toContain('kind: "reflection"');
    expect(read("src/components/dhikr/SharePosterModal.tsx")).toContain('kind: "dhikr"');
    expect(read("src/pages/HadithReader.tsx")).toContain('kind: "hadith"');
    expect(mushaf).not.toContain("athar.app");
  });

  it("keeps the Mushaf share menu to three clear choices", () => {
    const mushaf = read("src/pages/Mushaf.tsx");
    const sheet = mushaf.slice(mushaf.indexOf('className="mushaf-share-grid is-three"'));
    const choices = sheet.slice(0, sheet.indexOf("</div>")).match(/className="mushaf-share-opt/g) ?? [];
    expect(choices).toHaveLength(3);
    expect(mushaf).not.toContain("صورة فنية");
  });
});
