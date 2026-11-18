import fs from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs build script without type declarations
import { readAsma, renderSwift } from "../tools/scripts/generate-ios-asma.mjs";

const swift = fs.readFileSync("ios/App/AtharWidgets/AsmaAlHusna.swift", "utf8");
const widgets = fs.readFileSync("ios/App/AtharWidgets/AtharDailyWidgets.swift", "utf8");
const bundle = fs.readFileSync("ios/App/AtharWidgets/AtharWidgets.swift", "utf8");
const appDelegate = fs.readFileSync("ios/App/App/AppDelegate.swift", "utf8");

describe("iPhone daily widgets", () => {
  it("carry exactly the app's 99 Names (regenerate with tools/scripts/generate-ios-asma.mjs)", () => {
    expect(swift).toBe(renderSwift(readAsma()));
  });

  it("pick the Name of the day the way the app and the Android widget do", () => {
    const page = fs.readFileSync("src/pages/AsmaAlHusna.tsx", "utf8");
    const android = fs.readFileSync("android/app/src/main/java/com/athar/adhkar/NoorAsmaWidgetProvider.java", "utf8");
    expect(page).toContain("Math.floor(today.getTime() / 86400000)");
    expect(page).toContain("(dayIndex % 99) + 1");
    expect(android).toContain("System.currentTimeMillis() / 86400000L");
    expect(swift).toContain("date.timeIntervalSince1970 / 86_400");
    expect(swift).toContain("((days % 99) + 99) % 99");
  });

  it("read the payloads AppDelegate mirrors into the App Group", () => {
    for (const key of ["noor_widget_adhkar_v1", "noor_widget_wird_v1", "noor_widget_dashboard_v1"]) {
      expect(widgets).toContain(`"${key}"`);
      expect(appDelegate).toContain(`"${key}"`);
    }
  });

  it("are all in the widget bundle and open the same screens as on Android", () => {
    for (const widget of ["AtharAdhkarWidget()", "AtharWirdWidget()", "AtharStreakWidget()", "AtharAsmaWidget()"]) {
      expect(bundle).toContain(widget);
    }
    for (const route of ['"/c/morning"', '"/c/evening"', '"/quran"', '"/asma"']) expect(widgets).toContain(route);
  });

  it("count with the Android tasbeeh widget's exact phrases and targets, into the same ledger", () => {
    const tasbeeh = fs.readFileSync("ios/App/AtharWidgets/AtharTasbeehWidget.swift", "utf8");
    const android = fs.readFileSync("android/app/src/main/java/com/athar/adhkar/NoorTasbeehWidgetProvider.java", "utf8");
    const androidPhrases = [...android.match(/DHIKR_AR = \{([\s\S]*?)\};/)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const iosPhrases = [...tasbeeh.match(/static let phrases = \[([^\]]+)\]/)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(iosPhrases).toEqual(androidPhrases);
    const androidTargets = android.match(/DHIKR_TARGET = \{([^}]+)\}/)![1].replace(/\s/g, "");
    expect(tasbeeh).toContain(`static let targets = [${androidTargets.split(",").join(", ")}]`);
    expect(tasbeeh).toContain('"noor_widget_tasbeeh_totals_v1"');
    expect(tasbeeh).toContain('"noor_widget_tasbeeh_owner_v1"');
    expect(appDelegate).toContain('"noor_widget_tasbeeh_owner_v1"');
    expect(bundle).toContain("AtharTasbeehWidget()");
  });
});
