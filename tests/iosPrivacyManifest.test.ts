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
});
