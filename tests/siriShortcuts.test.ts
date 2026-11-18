import fs from "node:fs";
import { describe, expect, it } from "vitest";

const intent = fs.readFileSync("ios/App/App/NextPrayerIntent.swift", "utf8");
const shortcuts = fs.readFileSync("ios/App/App/AtharIntents.swift", "utf8");
const arabic = fs.readFileSync("ios/App/App/ar.lproj/AppShortcuts.strings", "utf8");
const project = fs.readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");

describe("Siri: next prayer", () => {
  const phrases = [...shortcuts.matchAll(/^\s+"([^"]*\\\(\.applicationName\)[^"]*)",$/gm)]
    .map((m) => m[1].replace("\\(.applicationName)", "${applicationName}").replace("\\(\\.$surah)", "${surah}"));

  it("has an Arabic phrase for every English phrase, keyed exactly as Xcode expects", () => {
    expect(phrases.length).toBeGreaterThanOrEqual(13);
    const keys = [...arabic.matchAll(/^"([^"]+)" = "([^"]+)";$/gm)];
    expect(keys.map((m) => m[1])).toEqual(phrases);
    for (const [key, , translation] of keys) {
      expect(translation).toContain("${applicationName}");
      if (key.includes("${surah}")) expect(translation).toContain("${surah}");
    }
  });

  it("is built into the app with its Arabic phrases", () => {
    expect(project).toMatch(/NextPrayerIntent\.swift in Sources/);
    expect(project).toMatch(/AtharIntents\.swift in Sources/);
    expect(project).toMatch(/SurahNames\.swift in Sources/);
    expect(project).toMatch(/AppShortcuts\.strings in Resources/);
  });

  it("reads the same prayer times the widgets use", () => {
    expect(intent).toContain('"noor_widget_prayer_v2"');
    expect(intent).toContain('"CapacitorStorage." + key');
  });
});
