import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const exists = (path: string) => existsSync(new URL(path, root));

/** PNG colour type from the IHDR chunk: 2 = RGB, 6 = RGBA. */
function pngColourType(path: string): number {
  return readFileSync(new URL(path, root))[25];
}

describe("themed app icons", () => {
  const set = "ios/App/App/Assets.xcassets/AppIcon.appiconset/";

  it("gives the iPhone a dark and a tinted version of the main icon", () => {
    const contents = JSON.parse(read(`${set}Contents.json`)) as {
      images: Array<{ filename: string; appearances?: Array<{ appearance: string; value: string }> }>;
    };
    const byAppearance = Object.fromEntries(contents.images.map((image) => [image.appearances?.[0]?.value ?? "any", image.filename]));
    expect(byAppearance).toEqual({ any: "AppIcon-512@2x.png", dark: "AppIcon-dark.png", tinted: "AppIcon-tinted.png" });
    for (const file of Object.values(byAppearance)) expect(exists(`${set}${file}`)).toBe(true);
    // The App Store rejects an alpha channel on the main icon; the dark one needs it.
    expect(pngColourType(`${set}AppIcon-512@2x.png`)).toBe(2);
    expect(pngColourType(`${set}AppIcon-dark.png`)).toBe(6);
  });

  it("gives every Android icon a monochrome layer for themed icons", () => {
    const dir = "android/app/src/main/res/mipmap-anydpi-v26/";
    const icons = readdirSync(new URL(dir, root)).filter((file) => file.endsWith(".xml"));
    expect(icons.length).toBeGreaterThanOrEqual(10);
    for (const icon of icons) {
      expect(read(`${dir}${icon}`)).toContain('<monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>');
    }
    for (const density of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
      expect(pngColourType(`android/app/src/main/res/mipmap-${density}/ic_launcher_monochrome.png`)).toBe(6);
    }
  });
});
