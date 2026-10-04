// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_META_COLORS } from "@/hooks/useApplyTheme";
import { SAMA_PHASE_COLORS } from "@/lib/samaTheme";

const html = readFileSync("index.html", "utf8");

type MockMeta = {
  content: string;
  isConnected: boolean;
  attributes: Record<string, string>;
  hasAttribute: (name: string) => boolean;
  setAttribute: (name: string, value: string) => void;
  remove: () => void;
};

function makeMeta(content: string, media?: string): MockMeta {
  const meta: MockMeta = {
    content,
    isConnected: true,
    attributes: media ? { media } : {},
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      if (name === "content") this.content = value;
    },
    remove() {
      this.isConnected = false;
    },
  };
  return meta;
}

function runThemeBootstrap(
  storageValues: Record<string, string>,
  prefersLight = false,
  includeOsScopedMetas = false,
  storageThrows = false,
) {
  const loader = { style: { background: "#022c22" } };
  const colors = html.match(/<script id="theme-bootstrap-colors" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? "{}";
  const colorsElement = { textContent: colors };
  const metas = includeOsScopedMetas
    ? [makeMeta("#07080b", "(prefers-color-scheme: dark)"), makeMeta("#f7f8ff", "(prefers-color-scheme: light)")]
    : [makeMeta("#022c22")];
  const documentMock = {
    getElementById: (id: string) => id === "app-loader" ? loader : id === "theme-bootstrap-colors" ? colorsElement : null,
    querySelectorAll: (selector: string) => selector === 'meta[name="theme-color"]' ? metas.filter((meta) => meta.isConnected) : [],
    querySelector: (selector: string) => selector === 'meta[name="theme-color"]' ? metas.find((meta) => meta.isConnected) ?? null : null,
    createElement: (tagName: string) => tagName === "meta" ? makeMeta("") : null,
    head: {
      appendChild(meta: MockMeta) {
        meta.isConnected = true;
        metas.push(meta);
      },
    },
  };
  const localStorageMock = {
    getItem: (key: string) => {
      if (storageThrows) throw new Error("Storage is unavailable");
      return storageValues[key] ?? null;
    },
  };
  const windowMock = { matchMedia: () => ({ matches: prefersLight }) };
  const script = html.match(/<script id="theme-bootstrap">([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error("Theme bootstrap script missing");
  new Function("localStorage", "window", "document", script)(localStorageMock, windowMock, documentMock);
  return { loader, activeMeta: metas.find((meta) => meta.isConnected), metas: metas.filter((meta) => meta.isConnected) };
}

describe("pre-paint theme bootstrap", () => {
  it("keeps its palette map in sync with the runtime theme catalog and prayer phases", () => {
    const json = html.match(/<script id="theme-bootstrap-colors" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    expect(json).toBeTruthy();
    const catalog = JSON.parse(json!);
    expect(catalog.themes).toEqual(THEME_META_COLORS);
    expect(catalog.samaPhases).toEqual(SAMA_PHASE_COLORS);
  });

  it("uses forest on a fresh install and when browser storage is unavailable", () => {
    const fresh = runThemeBootstrap({});
    const unavailable = runThemeBootstrap({}, false, false, true);
    expect(fresh.loader.style.background).toBe(THEME_META_COLORS.forest);
    expect(fresh.activeMeta?.content).toBe(THEME_META_COLORS.forest);
    expect(unavailable.loader.style.background).toBe(THEME_META_COLORS.forest);
    expect(unavailable.activeMeta?.content).toBe(THEME_META_COLORS.forest);
  });

  it("ships an unscoped forest tint for the period before JavaScript can read storage", () => {
    const themeMetas = html.match(/<meta\s+name="theme-color"[^>]*>/g) ?? [];
    const loader = html.match(/<div id="app-loader"[\s\S]*?style="([\s\S]*?)">/)?.[1] ?? "";
    expect(themeMetas).toHaveLength(1);
    expect(themeMetas[0]).toContain(THEME_META_COLORS.forest);
    expect(themeMetas[0]).not.toContain("media=");
    expect(loader).toContain(`background:${THEME_META_COLORS.forest}`);
  });

  it("prefers the active-theme hint and removes OS-scoped browser chrome colors", () => {
    const result = runThemeBootstrap({
      athar_theme_bootstrap_v1: JSON.stringify({ theme: "diwan" }),
      noor_store_v1: JSON.stringify({ state: { prefs: { theme: "forest" } } }),
    }, true, true);
    expect(result.loader.style.background).toBe(THEME_META_COLORS.diwan);
    expect(result.activeMeta?.content).toBe(THEME_META_COLORS.diwan);
    expect(result.activeMeta?.hasAttribute("media")).toBe(false);
    expect(result.metas).toHaveLength(1);
  });

  it("keeps the legacy local preference as a fallback on existing installs", () => {
    const result = runThemeBootstrap({
      noor_store_v1: JSON.stringify({ state: { prefs: { theme: "waraq" } } }),
    });
    expect(result.loader.style.background).toBe(THEME_META_COLORS.waraq);
    expect(result.activeMeta?.content).toBe(THEME_META_COLORS.waraq);
    expect(result.metas).toHaveLength(1);
  });

  it("falls back to a valid legacy theme when the first-paint hint is invalid", () => {
    const result = runThemeBootstrap({
      athar_theme_bootstrap_v1: "not-a-theme",
      noor_store_v1: JSON.stringify({ state: { prefs: { theme: "midnight" } } }),
    });
    expect(result.loader.style.background).toBe(THEME_META_COLORS.midnight);
  });

  it("resolves the system theme using the OS preference", () => {
    const light = runThemeBootstrap({ athar_theme_bootstrap_v1: JSON.stringify({ theme: "system" }) }, true);
    const dark = runThemeBootstrap({ athar_theme_bootstrap_v1: JSON.stringify({ theme: "system" }) }, false);
    expect(light.loader.style.background).toBe(THEME_META_COLORS.light);
    expect(light.activeMeta?.content).toBe(THEME_META_COLORS.light);
    expect(dark.loader.style.background).toBe(THEME_META_COLORS.dark);
    expect(dark.activeMeta?.content).toBe(THEME_META_COLORS.dark);
  });

  it("uses the saved active prayer phase for the sama theme", () => {
    const result = runThemeBootstrap({
      athar_theme_bootstrap_v1: JSON.stringify({ theme: "sama", color: SAMA_PHASE_COLORS.fajr }),
    });
    expect(result.loader.style.background).toBe(SAMA_PHASE_COLORS.fajr);
    expect(result.activeMeta?.content).toBe(SAMA_PHASE_COLORS.fajr);
  });

  it("resolves sama from the legacy local prayer cache on an upgrade", () => {
    const result = runThemeBootstrap({
      noor_store_v1: JSON.stringify({ state: { prefs: { theme: "sama" } } }),
      noor_widget_prayer_v2: JSON.stringify({ nextPrayer: { nameAr: "المغرب" } }),
    });
    expect(result.loader.style.background).toBe(SAMA_PHASE_COLORS.maghrib);
    expect(result.activeMeta?.content).toBe(SAMA_PHASE_COLORS.maghrib);
  });
});
