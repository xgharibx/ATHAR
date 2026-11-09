import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("native backup file sharing contract", () => {
  it("registers a file-sharing promise on both native platforms", () => {
    const android = readFileSync(resolve(process.cwd(), "android/app/src/main/java/com/athar/adhkar/ShareBridgePlugin.java"), "utf8");
    const ios = readFileSync(resolve(process.cwd(), "ios/App/App/ShareBridgePlugin.swift"), "utf8");
    const info = readFileSync(resolve(process.cwd(), "ios/App/App/Info.plist"), "utf8");
    const androidShareFile = android.match(/@PluginMethod\s+public void shareFile\(PluginCall call\)\s*\{([\s\S]*?)\n    \}/)?.[1] ?? "";

    expect(androidShareFile).not.toBe("");
    expect(androidShareFile).toContain("Intent.EXTRA_STREAM");
    expect(androidShareFile).toContain("FileProvider.getUriForFile");
    expect(androidShareFile).toContain("UUID.randomUUID()");
    expect(android).toContain("SHARE_FILE_RETENTION_MILLIS");
    expect(android).toContain("pruneExpiredSharedFiles");
    expect(ios).toContain('CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise)');
    expect(ios).toMatch(/@objc func shareFile\(_ call: CAPPluginCall\)/);
    expect(ios).toContain("UIActivityViewController(activityItems: items");
    expect(info).toContain("UTExportedTypeDeclarations");
    expect(info).toContain("public.json");
    expect(info).toContain("application/json");
    expect(info).toContain("<string>athar</string>");
  });
});

describe("legacy Android gallery save permission contract", () => {
  it("declares write permission only through Android 9", () => {
    const manifest = readFileSync(resolve(process.cwd(), "android/app/src/main/AndroidManifest.xml"), "utf8");

    expect(manifest).toMatch(/<uses-permission\s+android:name="android\.permission\.WRITE_EXTERNAL_STORAGE"\s+android:maxSdkVersion="28"\s*\/>/);
  });

  it("requests permission only before pre-Android-10 gallery writes and rejects denial", () => {
    const android = readFileSync(resolve(process.cwd(), "android/app/src/main/java/com/athar/adhkar/ShareBridgePlugin.java"), "utf8");

    expect(android).toContain("@Permission(alias = \"gallery\", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })");
    expect(android).toContain("if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q");
    expect(android).toContain("requestPermissionForAlias(\"gallery\", call, \"saveImagePermissionCallback\")");
    expect(android).toMatch(/@PermissionCallback\s+private void saveImagePermissionCallback\(PluginCall call\)/);
    expect(android).toContain("call.reject(\"storage permission denied\")");
    expect(android).toContain("saveImageToGallery(call)");
  });
});
