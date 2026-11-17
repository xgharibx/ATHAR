import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("iOS privacy manifest", () => {
  const manifest = fs.readFileSync(
    path.resolve("ios/App/App/PrivacyInfo.xcprivacy"),
    "utf8",
  );
  const project = fs.readFileSync(
    path.resolve("ios/App/App.xcodeproj/project.pbxproj"),
    "utf8",
  );

  it("declares the app's UserDefaults access with the app-only reason", () => {
    expect(manifest).toContain("<key>NSPrivacyAccessedAPITypes</key>");
    expect(manifest).toContain("<string>NSPrivacyAccessedAPICategoryUserDefaults</string>");
    expect(manifest).toContain("<string>CA92.1</string>");
  });

  it("bundles PrivacyInfo.xcprivacy in the iOS app target resources", () => {
    expect(project).toContain("PrivacyInfo.xcprivacy in Resources");
    expect(project).toMatch(/lastKnownFileType = text\.xml; path = PrivacyInfo\.xcprivacy;/);
  });

  it("declares religious activity as linked sensitive information for app functionality", () => {
    expect(manifest).toMatch(
      /<dict>\s*<key>NSPrivacyCollectedDataType<\/key>\s*<string>NSPrivacyCollectedDataTypeSensitiveInfo<\/string>\s*<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<true\/>\s*<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<false\/>\s*<key>NSPrivacyCollectedDataTypePurposes<\/key>\s*<array>\s*<string>NSPrivacyCollectedDataTypePurposeAppFunctionality<\/string>\s*<\/array>\s*<\/dict>/,
    );
  });

  const swiftSources = (dir: string): string =>
    fs.readdirSync(path.resolve(dir))
      .filter((name) => name.endsWith(".swift"))
      .map((name) => fs.readFileSync(path.resolve(dir, name), "utf8"))
      .join("\n");
  const appSwift = `${swiftSources("ios/App/App")}\n${swiftSources("ios/App/Shared")}`;
  const widgetSwift = swiftSources("ios/App/AtharWidgets");

  it("declares every required-reason API the app's own Swift uses", () => {
    // Apple rejects uploads that use these without a declared reason.
    if (/contentModificationDate|modificationDate|creationDate|attributesOfItem/.test(appSwift)) {
      expect(manifest).toContain("<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>");
      expect(manifest).toContain("<string>C617.1</string>");
    }
    if (/UserDefaults\(suiteName:/.test(appSwift)) {
      expect(manifest).toContain("<string>1C8F.1</string>");
    }
    expect(appSwift).not.toMatch(/systemUptime|mach_absolute_time|volumeAvailableCapacity|systemFreeSize|activeInputModes/);
  });

  it("gives the widget extension its own manifest for its App Group reads", () => {
    const widgetManifest = fs.readFileSync(path.resolve("ios/App/AtharWidgets/PrivacyInfo.xcprivacy"), "utf8");
    expect(widgetSwift).toMatch(/UserDefaults\(suiteName:/);
    expect(widgetManifest).toContain("<string>NSPrivacyAccessedAPICategoryUserDefaults</string>");
    expect(widgetManifest).toContain("<string>1C8F.1</string>");
    // One copy bundled in the app, one in the widget extension.
    expect(project.match(/PrivacyInfo\.xcprivacy in Resources \*\/ = \{isa = PBXBuildFile/g)?.length).toBe(2);
  });
});
