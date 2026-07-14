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
    // Force lang off, then ensure pref is 'ar' and wait two ticks so persist
    // hydration (which uses setTimeout(..., 0) internally) doesn't clobber us.
    document.documentElement.lang = "";
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "ar" } }));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.lang).toBe("ar");
  });

  it("sets <html lang>='en' when uiLanguage is 'en'", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "en" } }));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.lang).toBe("en");
  });

  it("sets <html dir>='ltr' when textDir is explicitly 'ltr'", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, textDir: "ltr" } }));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("sets <html dir>='rtl' when textDir is explicitly 'rtl'", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, textDir: "rtl", uiLanguage: "en" } }));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("auto: detects rtl for Arabic lang", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "ar", textDir: "auto" } }));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("auto: detects ltr for English lang", async () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, uiLanguage: "en", textDir: "auto" } }));
    mount();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.documentElement.dir).toBe("ltr");
  });
});