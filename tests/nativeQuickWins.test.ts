// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("keeping the screen on", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("holds the browser wake lock while any screen asks, and lets go after the last", async () => {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release, released: false }));
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    const { holdScreenAwake, screenAwakeHolderCount } = await import("@/lib/screenAwake");

    const first = holdScreenAwake();
    const second = holdScreenAwake();
    await Promise.resolve();
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    expect(screenAwakeHolderCount()).toBe(2);

    first();
    first();
    expect(release).not.toHaveBeenCalled();
    second();
    expect(screenAwakeHolderCount()).toBe(0);
    expect(release).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(navigator, "wakeLock");
  });

  it("has native switches on both phones, registered in the apps", () => {
    expect(read("ios/App/App/ScreenAwakePlugin.swift")).toContain("isIdleTimerDisabled = true");
    expect(read("android/app/src/main/java/com/athar/adhkar/ScreenAwakePlugin.java")).toContain("FLAG_KEEP_SCREEN_ON");
    expect(read("ios/App/App/AtharBridgeViewController.swift")).toContain("registerPluginInstance(ScreenAwakePlugin())");
    expect(read("android/app/src/main/java/com/athar/adhkar/AtharActivity.java")).toContain("registerPlugin(ScreenAwakePlugin.class)");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("ScreenAwakePlugin.swift in Sources");
  });

  it("is used by the Mushaf, the tasbeeh counter and Tasmee, and can be turned off", () => {
    for (const page of ["src/pages/Sebha.tsx"]) {
      expect(read(page)).toContain("useKeepScreenAwake(");
    }
    expect(read("src/components/settings/groups/AppearanceGroup.tsx")).toContain("keepScreenAwake");
  });
});

describe("status bar colours on iPhone", () => {
  it("lets the app set the status bar style to match the theme", () => {
    // With this false, iOS ignores SystemBars.setStyle and the icons stay white on light themes.
    expect(read("ios/App/App/Info.plist")).toMatch(/<key>UIViewControllerBasedStatusBarAppearance<\/key>\s*<true\/>/);
  });
});

describe("in-app browser", () => {
  it("opens web pages in the app and leaves app links, internal links and other schemes alone", async () => {
    const { opensInApp } = await import("@/lib/inAppBrowser");
    const base = "https://localhost/sebha";
    expect(opensInApp("https://sunnah.com/bukhari:1", base)).toBe(true);
    expect(opensInApp("http://example.org/page", base)).toBe(true);
    expect(opensInApp("/quran", base)).toBe(false);
    expect(opensInApp(`${location.origin}/settings`, base)).toBe(false);
    expect(opensInApp("mailto:hi@example.org", base)).toBe(false);
    expect(opensInApp("tel:123", base)).toBe(false);
    expect(opensInApp("https://play.google.com/store/apps/details?id=com.athar.adhkar", base)).toBe(false);
    expect(opensInApp("https://apps.apple.com/app/id1", base)).toBe(false);
    expect(opensInApp("https://www.youtube.com/watch?v=x", base)).toBe(false);
    expect(opensInApp("https://youtu.be/x", base)).toBe(false);
    expect(opensInApp("https://www.google.com/maps/dir/?api=1", base)).toBe(false);
    expect(opensInApp("https://www.google.com/search?q=x", base)).toBe(true);
    expect(opensInApp("https://wa.me/123", base)).toBe(false);
    expect(opensInApp("not a url ::", "about:blank")).toBe(false);
  });

  it("has native browsers on both phones, registered in the apps", () => {
    expect(read("ios/App/App/InAppBrowserPlugin.swift")).toContain("SFSafariViewController");
    expect(read("android/app/src/main/java/com/athar/adhkar/InAppBrowserPlugin.java")).toContain("CustomTabsIntent");
    expect(read("android/app/build.gradle")).toContain("androidx.browser:browser:");
    expect(read("ios/App/App/AtharBridgeViewController.swift")).toContain("registerPluginInstance(InAppBrowserPlugin())");
    expect(read("android/app/src/main/java/com/athar/adhkar/AtharActivity.java")).toContain("registerPlugin(InAppBrowserPlugin.class)");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("InAppBrowserPlugin.swift in Sources");
    expect(read("src/main.tsx")).toContain("installInAppBrowserLinks");
  });
});

describe("share menu in the Android app", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "share");

  afterEach(() => {
    vi.doUnmock("@capacitor/core");
    vi.resetModules();
    if (original) Object.defineProperty(navigator, "share", original);
    else Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "canShare");
  });

  it("fills in navigator.share with the native share menu when the web view has none", async () => {
    const bridge = {
      shareText: vi.fn(() => Promise.resolve()),
      shareImage: vi.fn(() => Promise.resolve()),
      shareFile: vi.fn(() => Promise.resolve()),
      saveImage: vi.fn(() => Promise.resolve()),
    };
    vi.resetModules();
    vi.doMock("@capacitor/core", () => ({
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
      registerPlugin: () => bridge,
    }));
    Reflect.deleteProperty(navigator, "share");
    const { installNativeWebShare } = await import("@/lib/shareTargets");
    installNativeWebShare();

    expect(typeof navigator.share).toBe("function");
    await navigator.share({ text: "سبحان الله", url: "https://www.athark.org" });
    expect(bridge.shareText).toHaveBeenCalledWith({ text: "سبحان الله\nhttps://www.athark.org", title: "أثر" });

    const file = new File([new Uint8Array([1, 2, 3])], "ayah.png", { type: "image/png" });
    expect(navigator.canShare?.({ files: [file] })).toBe(true);
    await navigator.share({ files: [file] });
    expect(bridge.shareImage).toHaveBeenCalledTimes(1);
  });

  it("leaves a browser alone", async () => {
    vi.resetModules();
    Reflect.deleteProperty(navigator, "share");
    const { installNativeWebShare } = await import("@/lib/shareTargets");
    installNativeWebShare();
    expect(navigator.share).toBeUndefined();
  });
});
