// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  bloomTarget,
  isNightByNextPrayer,
  moonIllumination,
  moonPhase,
  seededRandom,
} from "@/components/ufuq/garden/gardenMath";
import { GardenEngine } from "@/components/ufuq/garden/GardenEngine";
import { FLOWER_STAGES, flowerVariants, mix, paintFlowerHead } from "@/components/ufuq/garden/gardenSprites";
import { normalizeUfuqLook, normalizeUfuqPalette, resolveUfuqPalette, UFUQ_GARDEN_META_COLORS } from "@/lib/design";
import { applyUfuqDesign } from "@/hooks/useApplyTheme";
import { searchSettings } from "@/lib/settingsCatalog";
import { useNoorStore } from "@/store/noorStore";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (!("ResizeObserver" in globalThis)) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("the sky over the garden", () => {
  it("knows tonight's moon", () => {
    // Known new moon and full moon.
    const newMoon = moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14)));
    expect(Math.min(newMoon, 1 - newMoon)).toBeLessThan(0.01);
    const full = moonPhase(new Date(Date.UTC(2024, 0, 25, 17, 54)));
    expect(Math.abs(full - 0.5)).toBeLessThan(0.04);
    const firstQuarter = moonPhase(new Date(Date.UTC(2024, 1, 16, 15, 1)));
    expect(Math.abs(firstQuarter - 0.25)).toBeLessThan(0.04);
  });

  it("lights the right share of the disc", () => {
    expect(moonIllumination(0)).toBeCloseTo(0);
    expect(moonIllumination(0.25)).toBeCloseTo(0.5);
    expect(moonIllumination(0.5)).toBeCloseTo(1);
  });

  it("turns to night after Maghrib and back after Fajr", () => {
    expect(isNightByNextPrayer("العشاء", 19)).toBe(true);
    expect(isNightByNextPrayer("الفجر", 2)).toBe(true);
    expect(isNightByNextPrayer("الظهر", 9)).toBe(false);
    expect(isNightByNextPrayer("المغرب", 16)).toBe(false);
    expect(isNightByNextPrayer(null, 22)).toBe(true);
    expect(resolveUfuqPalette("time", false, true)).toBe("night");
    expect(resolveUfuqPalette("time", true, false)).toBe("day");
  });
});

describe("the garden grows", () => {
  it("always blooms, and blooms more with remembrance, up to what fits", () => {
    const base = bloomTarget(0, 0);
    expect(base).toBeGreaterThan(0);
    expect(bloomTarget(33, 0)).toBeGreaterThan(base);
    expect(bloomTarget(100, 5)).toBeGreaterThan(bloomTarget(33, 0));
    expect(bloomTarget(1_000_000, 1_000)).toBe(64);
    expect(bloomTarget(-5, -5)).toBe(base);
  });

  it("is the same garden every time on the same screen", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("steps aside where there is no canvas", () => {
    const opts = { mode: "night" as const, blooms: 14, palmFruit: false, treeFruit: false, live: true };
    expect(GardenEngine.create(document.createElement("canvas"), document.createElement("canvas"), opts)).toBeNull();
  });

  it("quotes the hadith of the seedlings of Paradise with its source", () => {
    const home = read("src/components/ufuq/UfuqHome.tsx");
    expect(home).toContain("غِراسَها: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر");
    expect(home).toContain("رواه الترمذي (٣٤٦٢)، وحسّنه الألباني");
  });
});

describe("the live garden", () => {
  it("mixes colours for light and shade", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#102030", "#102030", 0.7)).toBe("#102030");
    expect(mix("#ff0000", "#0000ff", 2)).toBe("#0000ff");
  });

  it("opens each flower over several stages, with roses in more than one colour", () => {
    expect(FLOWER_STAGES).toBeGreaterThanOrEqual(8);
    expect(flowerVariants("rose")).toBeGreaterThan(1);
    // No canvas here: painting quietly gives nothing rather than throwing.
    expect(() => paintFlowerHead("rose", 0, 0.5, 40, "night", 2)).not.toThrow();
  });

  it("draws real plants, not shapes: palm fronds of leaflets, rose petals, a drawn moon", () => {
    const engine = read("src/components/ufuq/garden/GardenEngine.ts");
    for (const used of ["paintFrond", "paintPalmTrunk", "paintPomegranate", "paintCypress", "paintFlowerHead", "paintMoon"]) {
      expect(engine).toContain(used);
    }
    // A flower earned by a tasbeeh grows: the stem rises, then the bud opens.
    expect(engine).toContain("const opening = clamp01((age - 0.8) / 2.6)");
    expect(read("src/components/ufuq/UfuqShell.tsx")).toContain("<LiveGardenBackdrop />");
  });
});

describe("the filmed garden is retired", () => {
  it("ships no footage or photographs", () => {
    for (const file of ["night.mp4", "day.mp4", "night.jpg", "day.jpg"]) {
      expect(existsSync(resolve(process.cwd(), `public/garden/${file}`))).toBe(false);
    }
    expect(existsSync(resolve(process.cwd(), "src/components/ufuq/garden/GardenBackdrop.tsx"))).toBe(false);
    // The moon is drawn (the cartoon one people preferred), not a photograph.
    expect(existsSync(resolve(process.cwd(), "public/garden/moon.jpg"))).toBe(false);
  });

  it("gives anyone who had it the drawn garden instead", () => {
    expect(normalizeUfuqLook("garden")).toBe("live");
  });
});

describe("the look and the brand", () => {
  it("defaults to the garden, at night, inside «أفق»", () => {
    expect(normalizeUfuqLook(undefined)).toBe("live");
    expect(normalizeUfuqPalette(undefined)).toBe("night");
    expect(normalizeUfuqLook("plain")).toBe("plain");
    expect(normalizeUfuqPalette("time")).toBe("time");
  });

  it("marks the look on <html> and tints the bars with the garden's sky", () => {
    const color = applyUfuqDesign("night", "live");
    expect(document.documentElement.dataset.ufuqLook).toBe("garden");
    expect(color).toBe(UFUQ_GARDEN_META_COLORS.night);
    expect(read("index.html")).toContain('root.setAttribute("data-ufuq-look"');
  });

  it("uses Athar's own mark, taken from the app icon", () => {
    expect(existsSync(resolve(process.cwd(), "public/brand/athar-print.png"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "public/brand/athar-word.png"))).toBe(true);
    const shell = read("src/components/ufuq/UfuqShell.tsx");
    expect(shell).toContain("brand/athar-print.png");
    expect(shell).toContain("همسة تطمئن قلبك،");
  });

  it("reaches the classic design only through its «حديقة الليل» theme", () => {
    expect(read("src/styles/globals.css")).not.toContain("ufuq-look");
    const shell = read("src/components/layout/AppShell.tsx");
    expect(shell).toContain('prefs.theme === "hadiqa"');
    expect(shell).toContain('<LiveGardenBackdrop forcedMode="night" />');
  });
});

describe("garden settings", () => {
  let container: HTMLDivElement | null = null;
  afterEach(() => {
    container?.remove();
    container = null;
    useNoorStore.getState().setPrefs({ designMode: "classic", ufuqLook: "live", gardenLive: true });
  });

  it("is found by search", () => {
    expect(searchSettings("الحديقة")[0]?.item.id).toBe("ufuq-look");
    expect(searchSettings("المغرب").map((r) => r.item.id)).toContain("ufuq-palette");
  });

  it("offers the garden, its motion switch and the plain look", async () => {
    useNoorStore.getState().setPrefs({ designMode: "ufuq" });
    const { SettingsPage } = await import("@/pages/Settings");
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/settings/appearance"]}>
          <Routes>
            <Route path="/settings/:group?" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    expect(container.textContent).toContain("حركة المشهد");
    expect(container.textContent).toContain("الوقت");
    const plain = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((b) => b.textContent?.includes("بسيط"))!;
    await act(async () => plain.click());
    expect(useNoorStore.getState().prefs.ufuqLook).toBe("plain");
    expect(container.textContent).not.toContain("حركة المشهد");
    await act(async () => root.unmount());
  });
});

describe("«حديقة الليل» in the classic design", () => {
  it("is offered among the classic themes as a dark one", async () => {
    const { THEME_CHOICES, isDarkTheme, themeLabel } = await import("@/lib/settingsTheme");
    expect(THEME_CHOICES.map((c) => c.id)).toContain("hadiqa");
    expect(themeLabel("hadiqa")).toBe("حديقة الليل");
    expect(isDarkTheme("hadiqa")).toBe(true);
  });

  it("paints the right colours from the first frame", async () => {
    const { THEME_META_COLORS, applyThemeForTest } = await import("@/hooks/useApplyTheme");
    expect(THEME_META_COLORS.hadiqa).toBe("#010207");
    const catalog = JSON.parse(/<script id="theme-bootstrap-colors" type="application\/json">([^<]+)<\/script>/.exec(read("index.html"))![1]!);
    expect(catalog.themes.hadiqa).toBe(THEME_META_COLORS.hadiqa);
    delete document.documentElement.dataset.design;
    applyThemeForTest("hadiqa");
    expect(document.documentElement.classList.contains("hadiqa")).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#010207");
  });

  it("has its own colours and stays readable in the see-through mode", () => {
    const css = read("src/styles/globals.css");
    expect(css).toContain(".hadiqa {");
    expect(css).toContain(".hadiqa body.transparent-mode .glass");
  });
});
