// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("Feedback page inside the app", () => {
  const page = read("src/pages/Feedback.tsx");
  it("lifts the launch screen when the app opens straight onto it", () => {
    expect(page).toMatch(/useStartupReady\(\)/);
  });
  it("goes back inside the app instead of loading the website's 'open the app' script", () => {
    expect(page).not.toContain('returnScript.src = "/feedback/return.js"');
    expect(page).not.toContain("data-af-return");
    expect(page.match(/onClick=\{backToApp\}/g)).toHaveLength(2);
  });
  it("keeps clear of the status bar and notch", () => {
    expect(read("public/feedback/feedback.css")).toMatch(/\.af-wrap\{[^}]*env\(safe-area-inset-top/);
  });
});

describe("Sources page", () => {
  const page = read("src/pages/Sources.tsx");
  it("refreshes the adhkar after importing or removing a pack, without reloading the app", () => {
    expect(page).not.toContain("location.reload");
    expect(page.match(/invalidateQueries\(\{ queryKey: \["adhkar-db"\] \}\)/g)!.length).toBeGreaterThanOrEqual(3);
  });
  it("lets Android's file picker offer .json files", () => {
    expect(page).toContain('accept=".json,application/json"');
  });
});

describe("Search results", () => {
  const page = read("src/pages/Search.tsx");
  it("never puts the copy button inside the verse button", () => {
    const verseRow = page.slice(page.indexOf("Two buttons side by side"), page.indexOf('aria-label="نسخ الآية"'));
    // The verse button closes before the copy button opens.
    expect(verseRow.indexOf("</button>")).toBeGreaterThan(0);
    expect(page).not.toMatch(/opacity-0 group-hover:opacity-60/);
  });
});
