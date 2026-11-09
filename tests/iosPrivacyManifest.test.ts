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
});
