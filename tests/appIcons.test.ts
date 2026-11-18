import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_ICONS } from "@/lib/appIcon";

const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const androidPlugin = fs.readFileSync("android/app/src/main/java/com/athar/adhkar/AppIconPlugin.java", "utf8");
const iosPlugin = fs.readFileSync("ios/App/App/AppIconPlugin.swift", "utf8");
const project = fs.readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
const settings = fs.readFileSync("src/pages/Settings.tsx", "utf8");
const variants = APP_ICONS.filter((name) => name !== "default");
const title = (name: string) => name[0]!.toUpperCase() + name.slice(1);

describe("alternate app icons", () => {
  it("keeps the original launcher entry name, so home-screen icons survive the update", () => {
    const launchers = [...manifest.matchAll(/<activity-alias[\s\S]*?android:name="([^"]+)"[\s\S]*?android:enabled="(true|false)"[\s\S]*?<\/activity-alias>/g)];
    expect(launchers.map((m) => [m[1], m[2]])).toEqual([
      [".MainActivity", "true"],
      ...variants.map((v) => [`.MainActivity${title(v)}`, "false"]),
    ]);
    // The real activity no longer declares the launcher itself.
    const activity = manifest.match(/<activity\s[^>]*android:name="\.AtharActivity"[\s\S]*?<\/activity>/)![0];
    expect(activity).not.toContain("android.intent.category.LAUNCHER");
    for (const alias of launchers) expect(alias[0]).toContain('android:targetActivity=".AtharActivity"');
  });

  it("offers the same five icons on Android, iPhone and in Settings", () => {
    for (const name of variants) {
      expect(androidPlugin).toContain(`case "${name}": return ".MainActivity${title(name)}";`);
      expect(iosPlugin).toContain(`"${name}": "AppIcon-${title(name)}"`);
      expect(settings).toContain(`{ id: "${name}",`);
    }
  });

  it("ships every icon file each platform needs", () => {
    for (const name of variants) {
      for (const density of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
        for (const suffix of ["", "_round", "_foreground"]) {
          expect(fs.existsSync(`android/app/src/main/res/mipmap-${density}/ic_launcher_${name}${suffix}.png`)).toBe(true);
        }
      }
      expect(fs.existsSync(`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_${name}.xml`)).toBe(true);
      expect(fs.existsSync(`ios/App/App/Assets.xcassets/AppIcon-${title(name)}.appiconset/icon.png`)).toBe(true);
    }
    const setting = `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "${variants.map((v) => `AppIcon-${title(v)}`).join(" ")}";`;
    expect(project.split(setting).length - 1).toBe(2);
  });

  it("points widgets and shortcuts at the real activity, which works whichever icon is on", () => {
    expect(fs.readFileSync("android/app/src/main/java/com/athar/adhkar/AtharWidgetProvider.java", "utf8")).toContain("new Intent(context, AtharActivity.class)");
    expect(fs.readFileSync("android/app/src/main/res/xml/shortcuts.xml", "utf8")).not.toContain('targetClass="com.athar.adhkar.MainActivity"');
  });
});
