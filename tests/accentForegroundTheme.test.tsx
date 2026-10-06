// @vitest-environment jsdom
import * as React from "react";
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAccessibleAccentForeground } from "@/lib/accentContrast";
import { applyThemeForTest, useApplyTheme } from "@/hooks/useApplyTheme";
import { useNoorStore } from "@/store/noorStore";

function ThemeHarness() {
  useApplyTheme();
  return null;
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(foreground: string, background: string) {
  const toLuminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map((part) => Number.parseInt(part, 16));
    const [red, green, blue] = channels.map(channelToLinear);
    return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
  };
const values = [toLuminance(foreground), toLuminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

const themeCss = readFileSync("src/styles/globals.css", "utf8");
const accentDeclarationCount = [...themeCss.matchAll(/--accent\s*:/gi)].length;
const themeAccents = [...themeCss.matchAll(/--accent:\s*(#[\da-f]{3,6})\s*;/gi)]
  .map((match) => match[1]!.toLowerCase());

describe("accent foreground contrast", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    document.documentElement.style.removeProperty("--accent");
    delete document.documentElement.dataset.accentForeground;
    useNoorStore.setState((state) => ({
      prefs: { ...state.prefs, theme: "forest", customAccent: "#34d399" },
    }));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.documentElement.style.removeProperty("--accent");
    delete document.documentElement.dataset.accentForeground;
  });

  it.each([
    ["#34d399", "#000000"],
    ["#8f3b2c", "#ffffff"],
    ["#757575", "#ffffff"],
    ["#777777", "#000000"],
    ["#ffffff", "#000000"],
    ["#000000", "#ffffff"],
  ])("chooses an AA-readable foreground for %s", (accent, expectedForeground) => {
    document.documentElement.style.setProperty("--accent", accent);

    applyThemeForTest("forest");

    const foreground = document.documentElement.dataset.accentForeground === "white" ? "#ffffff" : "#000000";
    expect(foreground).toBe(expectedForeground);
    expect(contrastRatio(foreground, accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themeAccents)("keeps every CSS theme accent readable (%s)", (accent) => {
    const foreground = getAccessibleAccentForeground(accent);
    expect(contrastRatio(foreground, accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("covers every accent declaration in the stylesheet", () => {
    expect(themeAccents).toHaveLength(accentDeclarationCount);
  });

  it("keeps Forest green while using white for its control accent", () => {
    const forest = themeCss.match(/\.forest\s*\{([^}]+)\}/)?.[1] ?? "";
    expect(forest).toMatch(/--bg:\s*#022c22/i);
    expect(forest).toMatch(/--accent:\s*#ffffff/i);
    expect(readFileSync("src/pages/Settings.tsx", "utf8"))
      .toMatch(/forest:\s*"#ffffff"/i);
  });

  it("updates the foreground when the selected custom accent changes", async () => {
    await act(async () => {
      root.render(React.createElement(ThemeHarness));
      await Promise.resolve();
    });
    expect(document.documentElement.dataset.accentForeground).toBe("black");

    await act(async () => {
      useNoorStore.setState((state) => ({
        prefs: { ...state.prefs, customAccent: "#8f3b2c" },
      }));
      await Promise.resolve();
    });

    expect(document.documentElement.dataset.accentForeground).toBe("white");
  });
});
