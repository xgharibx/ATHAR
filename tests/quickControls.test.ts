import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("iPhone controls (Control Center, Lock Screen, Action button)", () => {
  const controls = read("ios/App/AtharWidgets/AtharControls.swift");
  const bundle = read("ios/App/AtharWidgets/AtharWidgets.swift");

  it("offers the tasbeeh, prayer times, Mushaf and Qibla on iOS 18 and later", () => {
    for (const [name, route] of [["Sebha", "/sebha"], ["Prayer", "/prayer-times"], ["Mushaf", "/mushaf"], ["Qibla", "/qibla"]]) {
      expect(controls).toContain(`struct Athar${name}Control: ControlWidget`);
      expect(controls).toContain(`OpenAtharScreenIntent(route: "${route}")`);
      expect(bundle).toMatch(new RegExp(`if #available\\(iOS 18\\.0, \\*\\) \\{[\\s\\S]*Athar${name}Control\\(\\)`));
    }
  });

  it("runs the open action in the app, which hands the screen to the web view", () => {
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    // In both the app and the widget extension.
    expect(project.match(/OpenAtharScreenIntent\.swift in Sources \*\/ = \{isa = PBXBuildFile/g)?.length).toBe(2);
    expect(project).toMatch(/AtharControls\.swift in Sources/);
    expect(read("ios/App/Shared/OpenAtharScreenIntent.swift")).toContain("static let openAppWhenRun = true");
    expect(read("ios/App/App/AppDelegate.swift")).toContain("AtharScreenRouter.handler = { Self.deliverRoute($0) }");
  });
});

describe("Android Quick Settings tiles", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");

  it("declares the next-prayer and tasbeeh tiles", () => {
    for (const service of ["PrayerTileService", "SebhaTileService"]) {
      expect(manifest).toMatch(new RegExp(`android:name="\\.${service}"[\\s\\S]*?BIND_QUICK_SETTINGS_TILE[\\s\\S]*?action\\.QS_TILE`));
    }
  });

  it("opens the right screens and reads the widgets' prayer times", () => {
    expect(read("android/app/src/main/java/com/athar/adhkar/PrayerTileService.java")).toContain('"/prayer-times"');
    expect(read("android/app/src/main/java/com/athar/adhkar/PrayerTileService.java")).toContain('"noor_widget_prayer_v2"');
    expect(read("android/app/src/main/java/com/athar/adhkar/SebhaTileService.java")).toContain('"/sebha"');
    // Android 14+ only accepts a PendingIntent here.
    expect(read("android/app/src/main/java/com/athar/adhkar/AtharTileService.java")).toContain("startActivityAndCollapse(pending)");
  });

  it("has the tile labels in English and Arabic", () => {
    for (const file of ["values/strings.xml", "values-ar/strings.xml"]) {
      const strings = read(`android/app/src/main/res/${file}`);
      for (const name of ["tile_prayer_label", "tile_prayer_open", "tile_sebha_label", "tile_sebha_subtitle"]) {
        expect(strings).toContain(`name="${name}"`);
      }
    }
  });
});
