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
  lightsFor,
  isNightByNextPrayer,
  moonIllumination,
  moonPhase,
  seededRandom,
} from "@/components/ufuq/garden/gardenMath";
import { GardenOverlay, MOON_AT } from "@/components/ufuq/garden/gardenOverlay";
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
    expect(GardenOverlay.create(document.createElement("canvas"), "night", "/garden/moon.jpg")).toBeNull();
  });

  it("lights more fireflies with more remembrance", () => {
    expect(lightsFor(bloomTarget(0, 0))).toBeGreaterThan(0);
    expect(lightsFor(bloomTarget(100, 10))).toBeGreaterThan(lightsFor(bloomTarget(0, 0)));
    expect(lightsFor(64)).toBeLessThanOrEqual(48);
  });

  it("quotes the hadith of the seedlings of Paradise with its source", () => {
    const home = read("src/components/ufuq/UfuqHome.tsx");
    expect(home).toContain("غِراسَها: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر");
    expect(home).toContain("رواه الترمذي (٣٤٦٢)، وحسّنه الألباني");
  });
});

describe("the filmed garden", () => {
  const size = (p: string) => readFileSync(resolve(process.cwd(), p)).byteLength;

  it("ships a film and a still for each scene, and the Moon, within budget", () => {
    for (const scene of ["night", "day"]) {
      expect(size(`public/garden/${scene}.mp4`)).toBeLessThan(4.5 * 1024 * 1024);
      expect(size(`public/garden/${scene}.jpg`)).toBeLessThan(300 * 1024);
    }
    expect(size("public/garden/moon.jpg")).toBeLessThan(80 * 1024);
  });

  it("plays silently, inline and in a loop, with the still behind it", () => {
    const backdrop = read("src/components/ufuq/garden/GardenBackdrop.tsx");
    for (const attr of ["muted", "loop", "playsInline", "disablePictureInPicture", "poster={still}"]) {
      expect(backdrop).toContain(attr);
    }
    expect(backdrop).toContain("u-garden-still");
    // Autoplay may be refused: keep the still and retry on the next touch.
    expect(backdrop).toContain('window.addEventListener("pointerdown", retry');
  });

  it("documents where every clip comes from", () => {
    const readme = read("tools/garden-footage/README.md");
    for (const id of ["4148", "4621", "1178", "1168", "1187", "SVS 5048"]) expect(readme).toContain(id);
    expect(readme).toContain("Mixkit Stock Video Free License");
  });

  it("keeps the moon in open sky", () => {
    expect(MOON_AT.y).toBeGreaterThan(0.34);
    expect(MOON_AT.x).toBeLessThan(0.5);
  });
});

describe("the look and the brand", () => {
  it("defaults to the garden inside «أفق»", () => {
    expect(normalizeUfuqLook(undefined)).toBe("garden");
    expect(normalizeUfuqLook("plain")).toBe("plain");
    expect(normalizeUfuqPalette("time")).toBe("time");
  });

  it("marks the look on <html> and tints the bars with the garden's sky", () => {
    const color = applyUfuqDesign("night", "garden");
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
    expect(shell).toContain('<GardenBackdrop forcedMode="night" />');
  });
});

describe("garden settings", () => {
  let container: HTMLDivElement | null = null;
  afterEach(() => {
    container?.remove();
    container = null;
    useNoorStore.getState().setPrefs({ designMode: "classic", ufuqLook: "garden", gardenLive: true });
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
    expect(container.textContent).toContain("حديقة حيّة");
    expect(container.textContent).toContain("الوقت");
    const plain = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((b) => b.textContent?.includes("بسيط"))!;
    await act(async () => plain.click());
    expect(useNoorStore.getState().prefs.ufuqLook).toBe("plain");
    expect(container.textContent).not.toContain("حديقة حيّة");
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
