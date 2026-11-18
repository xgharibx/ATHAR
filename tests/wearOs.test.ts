import fs from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => fs.readFileSync(path, "utf8");
const javaStrings = (source: string, name: string) =>
  [...(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const javaInts = (source: string, name: string) =>
  (new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? "").split(",").map((v) => Number(v.trim()));

describe("Athar on Wear OS", () => {
  const watch = read("android/wear/src/main/java/com/athar/adhkar/wear/TasbeehActivity.java");
  const widget = read("android/app/src/main/java/com/athar/adhkar/NoorTasbeehWidgetProvider.java");

  it("counts the same phrases to the same targets as the phone's tasbeeh widget", () => {
    expect(javaStrings(watch, "PHRASES")).toEqual(javaStrings(widget, "DHIKR_AR"));
    expect(javaInts(watch, "TARGETS")).toEqual(javaInts(widget, "DHIKR_TARGET"));
  });

  it("talks to the phone app over the Wearable Data Layer", () => {
    const wearBuild = read("android/wear/build.gradle");
    expect(wearBuild).toContain('applicationId "com.athar.adhkar"');
    expect(read("android/app/build.gradle")).toContain('applicationId "com.athar.adhkar"');
    expect(watch).toContain('"/athar/prayer"');
    expect(watch).toContain('"/athar/tasbeeh"');
    const sync = read("android/app/src/main/java/com/athar/adhkar/WearSync.java");
    expect(sync).toContain('"/athar/prayer"');
    expect(sync).toContain('"/athar/tasbeeh"');
    expect(read("android/app/src/main/java/com/athar/adhkar/WearTasbeehService.java")).toContain("NoorTasbeehWidgetProvider.bumpDailyTotal(this, phrase, day)");
    expect(read("android/app/src/main/AndroidManifest.xml")).toMatch(/WearTasbeehService[\s\S]*?MESSAGE_RECEIVED[\s\S]*?pathPrefix="\/athar\/tasbeeh"/);
  });

  it("is a standalone watch app, built in CI with the phone app", () => {
    const manifest = read("android/wear/src/main/AndroidManifest.xml");
    expect(manifest).toContain('android:name="android.hardware.type.watch"');
    expect(manifest).toContain('android:name="com.google.android.wearable.standalone"');
    expect(read("android/settings.gradle")).toContain("include ':wear'");
    expect(read(".github/workflows/android-validate.yml")).toContain(":wear:assembleDebug :wear:lintDebug");
  });
});
