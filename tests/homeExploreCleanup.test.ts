import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("a calmer classic home", () => {
  const home = read("src/pages/Home.tsx");
  it("has no «تابع آخر قسم» and no content library", () => {
    expect(home).not.toContain("تابع آخر قسم");
    expect(home).not.toContain("مكتبة المحتوى");
  });

  it("starts with the busy cards hidden, once for everyone; each can be shown again in Settings", () => {
    const store = read("src/store/noorStore.ts");
    for (const key of ["smart", "checklist", "tasbeeh", "dailyWird", "dailyVerse", "quests"]) {
      expect(home).toContain(`  ${key}: false,`);
      expect(store).toContain(`    ${key}: false,`);
    }
    expect(store).toContain("version: 39,");
    expect(store).toContain("if (previousVersion < 39) {");
  });
});

describe("«اكتشف» in «أفق»", () => {
  const explore = read("src/pages/Explore.tsx");
  it("puts the adhkar last, as a category of their own", () => {
    expect(explore.indexOf('id="explore-adhkar"')).toBeGreaterThan(explore.indexOf("UFUQ_EXPLORE_GROUPS.map"));
    expect(explore).toContain("FEATURED_ADHKAR");
  });

  it("shows the leaderboard near the top, and quietly on «اليوم» (a trophy in the top bar)", () => {
    expect(explore.indexOf('navigate("/leaderboard")')).toBeLessThan(explore.indexOf("UFUQ_EXPLORE_GROUPS.map"));
    expect(read("src/components/ufuq/UfuqShell.tsx")).toContain('<NavLink to="/leaderboard" className="u-icon-btn" aria-label="المتصدرون">');
  });
});

describe("the old Quran section is gone", () => {
  it("leaves no old pages and copies nothing at startup", () => {
    for (const f of ["src/pages/Mushaf.tsx", "src/pages/Quran.tsx", "src/pages/Tafsir.tsx", "src/pages/Tasmee.tsx", "src/pages/QuranPlans.tsx", "src/lib/mushafOffline.ts"]) expect(existsSync(f), f).toBe(false);
    expect(read("src/App.tsx")).not.toContain("ensureMushafCoreOffline");
  });

  it("opens the Mushaf from the app icon straight at the new page", () => {
    expect(read("ios/App/App/Info.plist")).toContain("<string>/quran/page</string>");
    expect(read("android/app/src/main/res/xml/shortcuts.xml")).toContain('android:value="/quran/page"');
  });
});
