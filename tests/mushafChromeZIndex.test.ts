// @vitest-environment jsdom
/**
 * B3 regression — Mushaf top chrome bar must out-rank the page-content area
 * for pointer events so the toolbar icons stay tappable while a long page
 * is being scrolled. The fix in src/styles/globals.css pins the chrome to
 * `position: sticky; z-index: 30; pointer-events: auto; isolation: isolate;`
 * while leaving the .mushaf-page-content unchanged below it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("B3: mushaf top chrome sticky + z-index", () => {
  const css = readFileSync("src/styles/globals.css", "utf8");

  it("pins .mushaf-chrome-top to sticky so it stays above the scrolling page-area", () => {
    const headerBlock = css.match(/\.mushaf-chrome-top\s*\{[\s\S]*?\}/);
    expect(headerBlock, "missing .mushaf-chrome-top block").toBeTruthy();
    const block = headerBlock![0];
    expect(block).toMatch(/position:\s*sticky/);
  });

  it("lifts the chrome above the page content (z-index >= 25)", () => {
    const headerBlock = css.match(/\.mushaf-chrome-top\s*\{[\s\S]*?\}/);
    expect(headerBlock).toBeTruthy();
    const z = headerBlock![0].match(/z-index:\s*(\d+)/);
    expect(z, "missing z-index on chrome").toBeTruthy();
    expect(Number(z![1])).toBeGreaterThanOrEqual(25);
  });

  it("keeps pointer-events enabled on the chrome", () => {
    const headerBlock = css.match(/\.mushaf-chrome-top\s*\{[\s\S]*?\}/);
    expect(headerBlock).toBeTruthy();
    expect(headerBlock![0]).toMatch(/pointer-events:\s*auto/);
  });

  it("the bottom bar still out-ranks the chrome so audio/title stay on top", () => {
    const bottomBlock = css.match(/\.mushaf-bottom-bar\s*\{[\s\S]*?\}/);
    expect(bottomBlock).toBeTruthy();
    const z = bottomBlock![0].match(/z-index:\s*(\d+)/);
    const chromeBlock = css.match(/\.mushaf-chrome-top\s*\{[\s\S]*?\}/);
    const cz = chromeBlock![0].match(/z-index:\s*(\d+)/);
    expect(Number(z![1])).toBeGreaterThan(Number(cz![1]));
  });
});
