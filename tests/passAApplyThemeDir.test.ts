// @vitest-environment node
/**
 * Pass A — the `useApplyTheme` hook exposes two pure helpers that decide
 * what `<html dir>` and `<html lang>` should be given the user's `textDir`
 * and `uiLanguage` prefs. These cover the "auto" mode that previously
 * silently fell through to RTL regardless of language.
 */
import { describe, expect, it } from "vitest";
import { resolveTextDir, resolveUiLanguage } from "@/hooks/useApplyTheme";

describe("resolveTextDir (Pass A textDir wiring)", () => {
  it("returns 'rtl' when textDir is explicitly 'rtl'", () => {
    expect(resolveTextDir("rtl", "ar")).toBe("rtl");
    expect(resolveTextDir("rtl", "en")).toBe("rtl");
    expect(resolveTextDir("rtl", "fr")).toBe("rtl");
  });

  it("returns 'ltr' when textDir is explicitly 'ltr'", () => {
    expect(resolveTextDir("ltr", "ar")).toBe("ltr");
    expect(resolveTextDir("ltr", "en")).toBe("ltr");
  });

  it("auto detects RTL languages: ar, fa, ur, he, …", () => {
    expect(resolveTextDir("auto", "ar")).toBe("rtl");
    expect(resolveTextDir("auto", "fa")).toBe("rtl");
    expect(resolveTextDir("auto", "ur")).toBe("rtl");
    expect(resolveTextDir("auto", "he")).toBe("rtl");
    expect(resolveTextDir("auto", "ps")).toBe("rtl");
  });

  it("auto detects LTR languages: en, fr, de, …", () => {
    expect(resolveTextDir("auto", "en")).toBe("ltr");
    expect(resolveTextDir("auto", "fr")).toBe("ltr");
    expect(resolveTextDir("auto", "de")).toBe("ltr");
    expect(resolveTextDir("auto", "tr")).toBe("ltr");
  });

  it("auto handles BCP-47 variants — only the primary subtag matters", () => {
    expect(resolveTextDir("auto", "ar-SA")).toBe("rtl");
    expect(resolveTextDir("auto", "en-US")).toBe("ltr");
    expect(resolveTextDir("auto", "fr-CA")).toBe("ltr");
  });

  it("treats an undefined textDir as auto", () => {
    expect(resolveTextDir(undefined, "ar")).toBe("rtl");
    expect(resolveTextDir(undefined, "en")).toBe("ltr");
    expect(resolveTextDir(undefined, "")).toBe("ltr");
  });
});

describe("resolveUiLanguage (Pass A uiLanguage wiring)", () => {
  it("returns 'ar' when explicitly requested", () => {
    expect(resolveUiLanguage("ar")).toBe("ar");
  });

  it("returns 'en' when explicitly requested", () => {
    expect(resolveUiLanguage("en")).toBe("en");
  });

  it("falls back to 'ar' when undefined (athar defaults to Arabic)", () => {
    expect(resolveUiLanguage(undefined)).toBe("ar");
  });

  it("respects a custom fallback if caller passes one", () => {
    expect(resolveUiLanguage(undefined, "en")).toBe("en");
  });
});