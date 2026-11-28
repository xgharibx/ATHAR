// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  normalizeDesignMode,
  normalizeUfuqPalette,
  resolveUfuqPalette,
  UFUQ_META_COLORS,
} from "@/lib/design";
import { applyUfuqDesign, applyThemeForTest } from "@/hooks/useApplyTheme";
import { isUfuqTabRoot, ufuqTabFor, ufuqTitleFor, UFUQ_EXPLORE_GROUPS, UFUQ_TABS } from "@/components/ufuq/ufuqNav";
import { skyPhaseFor, ufuqClock, ufuqGreeting, untilLabel } from "@/components/ufuq/ufuqTime";
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

describe("choosing a design", () => {
  it("defaults to «أفق» unless a known design was chosen", () => {
    expect(normalizeDesignMode(undefined)).toBe("ufuq");
    expect(normalizeDesignMode("something")).toBe("ufuq");
    expect(normalizeDesignMode("ufuq")).toBe("ufuq");
    // The reorganised classic home remains a separate classic-family option.
    expect(normalizeDesignMode("classic-new")).toBe("classic-new");
    expect(normalizeUfuqPalette("night")).toBe("night");
    expect(normalizeUfuqPalette("blue")).toBe("night");
    expect(normalizeUfuqPalette("auto")).toBe("auto");
  });

  it("follows the phone only when asked to", () => {
    expect(resolveUfuqPalette("auto", true)).toBe("night");
    expect(resolveUfuqPalette("auto", false)).toBe("day");
    expect(resolveUfuqPalette("day", true)).toBe("day");
    expect(resolveUfuqPalette("night", false)).toBe("night");
  });

  it("keeps the classic theme in prefs while «أفق» is on", () => {
    const before = useNoorStore.getState().prefs.theme;
    useNoorStore.getState().setPrefs({ designMode: "ufuq", ufuqPalette: "night" });
    expect(useNoorStore.getState().prefs.theme).toBe(before);
    useNoorStore.getState().setPrefs({ designMode: "classic" });
    expect(useNoorStore.getState().prefs.theme).toBe(before);
  });
});

describe("applying «أفق» to the page", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    delete document.documentElement.dataset.design;
    delete document.documentElement.dataset.ufuqPalette;
  });

  it("marks <html>, sets the base light/dark class and tints the browser chrome", () => {
    const color = applyUfuqDesign("night");
    const root = document.documentElement;
    expect(root.dataset.design).toBe("ufuq");
    expect(root.dataset.ufuqPalette).toBe("night");
    expect(root.classList.contains("dark")).toBe(true);
    expect(color).toBe(UFUQ_META_COLORS.night);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(UFUQ_META_COLORS.night);

    applyUfuqDesign("day");
    expect(root.classList.contains("light")).toBe(true);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.dataset.ufuqPalette).toBe("day");
  });

  it("drops any classic theme class it finds", () => {
    applyThemeForTest("forest");
    expect(document.documentElement.classList.contains("forest")).toBe(true);
    applyUfuqDesign("day");
    expect(document.documentElement.classList.contains("forest")).toBe(false);
  });

  it("scopes every rule of the new design under data-design", () => {
    const css = read("src/styles/ufuq.css");
    const bareRootRules = css
      .split("\n")
      // Rules on body are fine only for the design's own .u-* elements.
      .filter((line) => /^:root\s*\{/.test(line) || (/^(body|html)\b/.test(line) && !line.includes(".u-")));
    expect(bareRootRules).toEqual([]);
    // The classic stylesheet never reads the attribute.
    expect(read("src/styles/globals.css")).not.toContain("data-design");
  });

  it("paints the chosen design before the app loads", () => {
    const html = read("index.html");
    expect(html).toContain('localStorage.getItem("athar_design_v1")');
    expect(html).toContain(UFUQ_META_COLORS.day);
    expect(html).toContain(UFUQ_META_COLORS.night);
  });
});

describe("finding your way in «أفق»", () => {
  it("has five tabs and knows which one a page belongs to", () => {
    expect(UFUQ_TABS.map((tab) => tab.label)).toEqual(["اليوم", "القرآن", "الصلاة", "السبحة", "اكتشف"]);
    expect(ufuqTabFor("/")).toBe("today");
    expect(ufuqTabFor("/c/morning")).toBe("today");
    expect(ufuqTabFor("/mushaf/12")).toBe("quran");
    expect(ufuqTabFor("/qibla")).toBe("prayer");
    expect(ufuqTabFor("/sebha")).toBe("tasbeeh");
    expect(ufuqTabFor("/hadith/bukhari/1")).toBe("explore");
    expect(isUfuqTabRoot("/quran")).toBe(true);
    expect(isUfuqTabRoot("/qibla")).toBe(false);
  });

  it("names every page in the top bar", () => {
    expect(ufuqTitleFor("/settings/appearance")).toBe("الإعدادات");
    expect(ufuqTitleFor("/islam-pillars")).toBe("أركان الإسلام");
    expect(ufuqTitleFor("/nowhere")).toBe("أثر");
  });

  it("links «اكتشف» only to pages that exist", () => {
    const routes = read("src/App.tsx");
    for (const group of UFUQ_EXPLORE_GROUPS) {
      for (const item of group.items) {
        const first = item.path.split("/")[1]!;
        expect(routes.includes(`path="${first}`) || routes.includes(`path="${item.path.slice(1)}"`), item.path).toBe(true);
      }
    }
  });
});

describe("the «اليوم» screen", () => {
  it("greets by the hour", () => {
    expect(ufuqGreeting(8)).toBe("صباح الخير");
    expect(ufuqGreeting(13)).toBe("طاب نهارك");
    expect(ufuqGreeting(17)).toBe("مساء الخير");
    expect(ufuqGreeting(23)).toBe("ليلةٌ طيبة");
  });

  it("paints the sky of the prayer time we are in", () => {
    const timings = { Fajr: "04:30", Sunrise: "06:00", Dhuhr: "11:40", Asr: "14:50", Maghrib: "17:10", Isha: "18:30" };
    expect(skyPhaseFor(3 * 60, timings)).toBe("isha");
    expect(skyPhaseFor(5 * 60, timings)).toBe("fajr");
    expect(skyPhaseFor(9 * 60, timings)).toBe("dhuhr");
    expect(skyPhaseFor(15 * 60, timings)).toBe("asr");
    expect(skyPhaseFor(17 * 60 + 30, timings)).toBe("maghrib");
    expect(skyPhaseFor(21 * 60, timings)).toBe("isha");
    expect(skyPhaseFor(13 * 60, undefined)).toBe("dhuhr");
  });

  it("says the countdown in words, with Arabic grammar", () => {
    expect(untilLabel(0)).toBe("حان الآن");
    expect(untilLabel(60)).toBe("بعد دقيقة");
    expect(untilLabel(2 * 60)).toBe("بعد دقيقتين");
    expect(untilLabel(7 * 60)).toBe("بعد ٧ دقائق");
    expect(untilLabel(3600)).toBe("بعد ساعة");
    expect(untilLabel(2 * 3600 + 14 * 60)).toBe("بعد ساعتين و١٤ دقيقة");
  });

  it("writes times in Arabic digits with the period apart", () => {
    expect(ufuqClock("17:05")).toEqual({ time: "٥:٠٥", period: "م" });
    expect(ufuqClock("04:30 (EET)")).toEqual({ time: "٤:٣٠", period: "ص" });
    expect(ufuqClock("00:10")).toEqual({ time: "١٢:١٠", period: "ص" });
  });
});

describe("the switch in Settings", () => {
  let container: HTMLDivElement | null = null;
  afterEach(() => {
    container?.remove();
    container = null;
    useNoorStore.getState().setPrefs({ designMode: "classic" });
  });

  async function render(path: string, element: React.ReactElement, routePath: string) {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path={routePath} element={element} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    return root;
  }

  it("is found by the words people use", () => {
    expect(searchSettings("التصميم الجديد")[0]?.item.id).toBe("design");
    expect(searchSettings("الكلاسيكي")[0]?.item.id).toBe("design");
  });

  it("switches to «أفق» and back, showing only the options of each", async () => {
    const { SettingsPage } = await import("@/pages/Settings");
    const root = await render("/settings/appearance", <SettingsPage />, "/settings/:group?");
    const radio = () => Array.from(container!.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((b) => b.textContent?.includes("أُفُق"))!;
    expect(container!.textContent).toContain("سمة التطبيق");
    expect(container!.textContent).not.toContain("النهار والليل");

    // «أفق» is made ready before it appears (a moment at most).
    await act(async () => {
      radio().click();
      for (let i = 0; i < 60 && useNoorStore.getState().prefs.designMode !== "ufuq"; i++) await new Promise((r) => setTimeout(r, 25));
    });
    expect(useNoorStore.getState().prefs.designMode).toBe("ufuq");
    expect(container!.textContent).toContain("النهار والليل");
    expect(container!.textContent).not.toContain("سمة التطبيق");
    expect(container!.textContent).not.toContain("خلفية النجوم");

    const classic = Array.from(container!.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((b) => b.textContent?.includes("الكلاسيكي"))!;
    await act(async () => classic.click());
    expect(useNoorStore.getState().prefs.designMode).toBe("classic");
    expect(container!.textContent).toContain("سمة التطبيق");
    await act(async () => root.unmount());
  });

  it("invites classic users from the first Settings page, and only them", async () => {
    const { SettingsPage } = await import("@/pages/Settings");
    let root = await render("/settings", <SettingsPage />, "/settings/:group?");
    expect(container!.textContent).toContain("جرّب «أُفُق»");
    await act(async () => root.unmount());
    container?.remove();

    useNoorStore.getState().setPrefs({ designMode: "ufuq" });
    root = await render("/settings", <SettingsPage />, "/settings/:group?");
    expect(container!.textContent).not.toContain("جرّب «أُفُق»");
    expect(container!.textContent).toContain("أُفُق ·");
    await act(async () => root.unmount());
  });

  it("renders «اكتشف» with every group", async () => {
    const { ExplorePage } = await import("@/pages/Explore");
    const root = await render("/explore", <ExplorePage />, "/explore");
    for (const group of UFUQ_EXPLORE_GROUPS) expect(container!.textContent).toContain(group.title);
    await act(async () => root.unmount());
  });
});
