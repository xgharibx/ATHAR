import { describe, expect, it } from "vitest";
import { collectProductionPackages, renderThirdPartyNotices } from "../tools/build/thirdPartyNotices";

const packages = collectProductionPackages(process.cwd());

/** Licences that permit use in a proprietary product with attribution only. */
const PERMISSIVE = /^(MIT|ISC|0BSD|BSD-2-Clause|BSD-3-Clause|Apache-2\.0|Zlib|Unlicense|CC0-1\.0|BlueOak-1\.0\.0)$/;
/**
 * Packages whose licence is not a standard identifier, reviewed by hand:
 * - gsap: free for commercial use under its standard "no charge" licence.
 * - webgl-constants: MIT in its repository; the published manifest omits the field.
 * - @capgo/capacitor-media-session: MPL-2.0, a file-level licence. It allows use in a
 *   proprietary app; its obligations cover only the plugin's own files, which ship
 *   unmodified, with their source public and their licence text in the notices.
 * - @fontsource/ibm-plex-sans-arabic: the typeface of the «أفق» design, under the SIL
 *   Open Font License 1.1, which allows bundling the font in any app, commercial or
 *   not; it only forbids selling the font files on their own.
 */
const REVIEWED = new Set(["gsap", "webgl-constants", "@capgo/capacitor-media-session", "@fontsource/ibm-plex-sans-arabic"]);

describe("third-party notices", () => {
  it("covers the packages the app ships", () => {
    const names = new Set(packages.map((item) => item.name));
    for (const name of ["react", "react-dom", "@supabase/supabase-js", "zod", "three"]) {
      expect(names.has(name)).toBe(true);
    }
    expect(names.has("vitest")).toBe(false);
  });

  it("ships no component under a copyleft or unreviewed licence", () => {
    const unexpected = packages
      .filter((item) => !PERMISSIVE.test(item.license) && !REVIEWED.has(item.name))
      .map((item) => `${item.name}: ${item.license}`);
    expect(unexpected).toEqual([]);
  });

  it("reproduces a licence text for nearly every component", () => {
    const missing = packages.filter((item) => !item.text).map((item) => item.name);
    expect(missing.length).toBeLessThanOrEqual(Math.ceil(packages.length * 0.05));
    const notices = renderThirdPartyNotices(packages);
    expect(notices).toContain("Permission is hereby granted, free of charge");
    expect(notices).toContain("Apache License");
  });
});
