// @vitest-environment jsdom
/**
 * Pass A — full `useApplyTheme` integration smoke. The hook is responsible
 * for syncing the user's `uiLanguage`/`textDir` prefs to the live `<html>`
 * element. These tests render the hook via `react-dom/client` and verify
 * the DOM after each pref flip.
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { useApplyTheme } from "@/hooks/useApplyTheme";
import { useNoorStore } from "@/store/noorStore";

function Harness() {
  useApplyTheme();
  return null;
}

/**
 * Wait for the DOM to actually reach the expected value.
 *
 * These tests used to await a fixed number of macrotasks, which is a race:
 * zustand's persist hydration runs on its own `setTimeout(…, 0)` and rewrites
 * `prefs`, so whether the assertion or the hydration lands first came down to
 * worker scheduling. It passed nearly always and failed roughly once in five
 * full-suite runs. Polling for the value removes the guesswork — it returns as
 * soon as the DOM settles, and only spends the full budget when genuinely broken.
 */
async function waitForAttr(attr: "lang" | "dir", expected: string): Promise<string> {
  for (let i = 0; i < 100; i += 1) {
    if (document.documentElement[attr] === expected) break;
    await new Promise((r) => setTimeout(r, 5));
  }
  return document.documentElement[attr];
}

describe("useApplyTheme (Pass A — DOM sync)", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    document.documentElement.lang = "";
    document.documentElement.dir = "";
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
    document.documentElement.lang = "";
    document.documentElement.dir = "";
  });

  function mount() {
    root = createRoot(container!);
    root.render(React.createElement(Harness));
  }

  it("sets <html lang>='ar' when uiLanguage is 'ar'", async () => {
    // Force lang off, then ensure the pref is 'ar'. persist hydration may still
    // land after mount, so wait for the value rather than for a fixed delay.
    document.documentElement.lang = "";
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "ar" } }));
    mount();
    expect(await waitForAttr("lang", "ar")).toBe("ar");
  });

  it("sets <html lang>='en' when uiLanguage is 'en'", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "en" } }));
    mount();
    expect(await waitForAttr("lang", "en")).toBe("en");
  });

  it("sets <html dir>='ltr' when textDir is explicitly 'ltr'", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, textDir: "ltr" } }));
    mount();
    expect(await waitForAttr("dir", "ltr")).toBe("ltr");
  });

  it("sets <html dir>='rtl' when textDir is explicitly 'rtl'", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, textDir: "rtl", uiLanguage: "en" } }));
    mount();
    expect(await waitForAttr("dir", "rtl")).toBe("rtl");
  });

  it("auto: detects rtl for Arabic lang", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "ar", textDir: "auto" } }));
    mount();
    expect(await waitForAttr("dir", "rtl")).toBe("rtl");
  });

  it("auto: detects ltr for English lang", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "en", textDir: "auto" } }));
    mount();
    expect(await waitForAttr("dir", "ltr")).toBe("ltr");
  });
});