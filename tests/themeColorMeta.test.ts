/**
 * @vitest-environment jsdom
 *
 * The browser tints its own chrome from <meta name="theme-color">. index.html
 * ships two of them guarded by prefers-color-scheme, so if those survive, the
 * BROWSER picks by system mode and ignores the theme the user chose — a
 * near-black Safari toolbar above a cream page, which is the "black menu" seen
 * in the Quran on iOS.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { applyThemeForTest } from "@/hooks/useApplyTheme";

const metas = () => Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));

beforeEach(() => {
  document.head.innerHTML = `
    <meta name="theme-color" content="#07080b" media="(prefers-color-scheme: dark)">
    <meta name="theme-color" content="#f7f8ff" media="(prefers-color-scheme: light)">`;
});

describe("theme-color follows the chosen theme", () => {
  it("drops every media-scoped copy", () => {
    applyThemeForTest("bustan");
    expect(metas().filter((m) => m.hasAttribute("media"))).toHaveLength(0);
  });

  it("leaves exactly one meta", () => {
    applyThemeForTest("bustan");
    expect(metas()).toHaveLength(1);
  });

  it("uses the light theme's colour even though a dark meta shipped first", () => {
    applyThemeForTest("bustan");
    expect(metas()[0]!.content.toLowerCase()).toBe("#f3ede2");
  });

  it("follows a switch to a dark theme", () => {
    applyThemeForTest("bustan");
    applyThemeForTest("layl");
    expect(metas()).toHaveLength(1);
    expect(metas()[0]!.content.toLowerCase()).toBe("#000000");
  });
});
