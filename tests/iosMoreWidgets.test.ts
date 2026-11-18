import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => fs.readFileSync(path, "utf8");
const swift = read("ios/App/AtharWidgets/AtharMoreWidgets.swift");
const bridge = read("src/lib/widgetDataBridge.ts");

describe("iPhone widgets matching Android's: missed prayers, today's hadith, Qibla", () => {
  it("are in the widget bundle and built into the extension", () => {
    const bundle = read("ios/App/AtharWidgets/AtharWidgets.swift");
    for (const widget of ["AtharQadaaWidget()", "AtharSunnahWidget()", "AtharQiblaWidget()"]) expect(bundle).toContain(widget);
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("AtharMoreWidgets.swift in Sources");
  });

  it("read the payloads the app already writes for the Android widgets", () => {
    const delegate = read("ios/App/App/AppDelegate.swift");
    for (const key of ["noor_widget_qadaa_v1", "noor_widget_sunnah_v1", "noor_widget_qibla_v1"]) {
      expect(swift).toContain(`"${key}"`);
      expect(bridge).toContain(`"${key}"`);
      expect(delegate).toContain(`"${key}",`);
    }
    for (const field of ["configured", "remaining", "percent", "quotaTotal", "quotaLeft", "fastRemaining", "ibadahDay", "fajrTime"]) {
      expect(swift).toContain(`let ${field}:`);
      expect(bridge).toMatch(new RegExp(`\\b${field}:`));
    }
  });

  it("open the same screens as the Android widgets", () => {
    expect(swift).toContain('moreURL("/qadaa")');
    expect(swift).toContain('moreURL("/qibla")');
    expect(swift).toContain('"/library/sharh?h=\\(id)"');
    // The hadith link keeps its query through AppDelegate.inAppRoute.
    expect(read("ios/App/App/AppDelegate.swift")).toContain('let route = url.query.map { path + "?" + $0 } ?? path');
  });

  it("forget cleared data (e.g. after signing out)", () => {
    expect(read("ios/App/App/AppDelegate.swift")).toContain("shared.removeObject(forKey: key)");
  });
});
