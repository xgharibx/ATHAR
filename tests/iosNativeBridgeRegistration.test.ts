import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("iOS native bridge registration", () => {
  it("builds the bridge and registers auth and sharing plugins in the app target", () => {
    const project = readFileSync(resolve(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
    const storyboard = readFileSync(resolve(process.cwd(), "ios/App/App/Base.lproj/Main.storyboard"), "utf8");
    const controllerPath = resolve(process.cwd(), "ios/App/App/AtharBridgeViewController.swift");
    const controller = existsSync(controllerPath) ? readFileSync(controllerPath, "utf8") : "";
    const sourcePhase = project.match(/\/\* Begin PBXSourcesBuildPhase section \*\/(.*?)\/\* End PBXSourcesBuildPhase section \*\//s)?.[1] ?? "";

    expect(sourcePhase).toContain("AuthBridgePlugin.swift in Sources");
    expect(sourcePhase).toContain("ShareBridgePlugin.swift in Sources");
    expect(sourcePhase).toContain("AtharBridgeViewController.swift in Sources");
    expect(storyboard).toContain('customClass="AtharBridgeViewController"');
    expect(controller).toContain("registerPluginInstance(AuthBridgePlugin())");
    expect(controller).toContain("registerPluginInstance(ShareBridgePlugin())");
  });

  it("keeps photo saving available on iOS 13 while using add-only access on iOS 14+", () => {
    const plugin = readFileSync(resolve(process.cwd(), "ios/App/App/ShareBridgePlugin.swift"), "utf8");
    const info = readFileSync(resolve(process.cwd(), "ios/App/App/Info.plist"), "utf8");

    expect(plugin).toContain("if #available(iOS 14.0, *)");
    expect(plugin).toContain("PHPhotoLibrary.authorizationStatus()");
    expect(plugin).toContain("PHPhotoLibrary.requestAuthorization {");
    expect(info).toContain("<key>NSPhotoLibraryUsageDescription</key>");
  });
});
