import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("home and Quran visual polish", () => {
  it("uses clear, labeled Afaq-style tabs for the daily carousel", () => {
    const carousel = read("src/components/ui/DailyCarousel.tsx");
    const styles = read("src/styles/dailyCarousel.css");

    expect(carousel).toContain('aria-label="زاد اليوم"');
    expect(carousel).toContain("aria-selected={activeIdx === i}");
    expect(carousel).toContain("daily-carousel-tab");
    expect(styles).toContain(".daily-carousel-tab.is-on");
  });

  it("keeps the home header simple and colors both occurrences of Athar", () => {
    const home = read("src/pages/Home.tsx");

    expect(home).not.toContain('aria-label="ذكر عشوائي"');
    expect(home).toContain('<span className="text-(--accent)">أثر</span>');
    expect(home).toContain('<span className="text-(--accent)">أثراً</span>');
  });

  it("places daily worship shortcuts with the daily-step card", () => {
    const home = read("src/pages/Home.tsx");

    expect(home.indexOf('aria-label="جدول الورد"')).toBeGreaterThan(home.indexOf("خطوة اليوم"));
    expect(home).toContain('aria-label="جدول المحاسبة"');
    expect(home).toContain('aria-label="قضاء الفوائت"');
  });

  it("removes the ornamental frame from Madina pages and unifies index tabs", () => {
    const quranCss = read("src/quran2/quran2.css");
    const index = read("src/quran2/pages/IndexPage.tsx");
    const frame = quranCss.match(/\.q2-mframe\s*\{([^}]+)\}/)?.[1] ?? "";

    expect(frame).not.toContain("border-image");
    expect(frame).not.toMatch(/outline:\s*1/);
    expect(index).toContain("q2-index-tabs");
    expect(quranCss).toContain(".q2-index-tab.is-on");
  });
});
