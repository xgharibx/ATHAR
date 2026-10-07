// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import config from "../capacitor.config";

const resources = new DOMParser().parseFromString(
  readFileSync("android/app/src/main/res/values/colors.xml", "utf8"),
  "application/xml",
);
const themes = new DOMParser().parseFromString(
  readFileSync("android/app/src/main/res/values/styles.xml", "utf8"),
  "application/xml",
);

function themeColor(theme: string, attribute: string): string | undefined {
  const resource = themes.querySelector(
    `style[name="${theme}"] > item[name="${attribute}"]`,
  )?.textContent?.trim();
  if (!resource?.startsWith("@color/")) return resource;
  return resources.querySelector(`color[name="${resource.slice(7)}"]`)
    ?.textContent?.trim().toLowerCase();
}

describe("Android startup background continuity", () => {
  it("uses the forest intro background before the WebView paints", () => {
    expect(config.android?.backgroundColor?.toLowerCase()).toBe("#022c22");
  });

  it.each([
    ["AppTheme.NoActionBar", "android:windowBackground"],
    ["AppTheme.NoActionBar", "android:background"],
    ["AppTheme.NoActionBarLaunch", "windowSplashScreenBackground"],
    ["AppTheme.NoActionBarLaunch", "android:background"],
  ])("keeps %s %s continuous with the intro", (theme, attribute) => {
    expect(themeColor(theme, attribute)).toBe("#022c22");
  });
});
