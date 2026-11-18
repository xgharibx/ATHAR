import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createMindfulSession, MIN_SESSION_MS, SESSION_IDLE_MS } from "@/lib/mindfulMinutes";

describe("tasbeeh as mindful minutes in Apple Health", () => {
  it("saves a session from the first count to the last before a pause", () => {
    vi.useFakeTimers();
    let now = 0;
    const save = vi.fn();
    const session = createMindfulSession(save, () => now);
    for (let i = 0; i <= 90; i += 1) {
      now = i * 1000;
      session.count();
    }
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SESSION_IDLE_MS);
    expect(save).toHaveBeenCalledWith(new Date(0), new Date(90_000));
    vi.useRealTimers();
  });

  it("skips sessions shorter than a minute", () => {
    let now = 0;
    const save = vi.fn();
    const session = createMindfulSession(save, () => now);
    session.count();
    now = MIN_SESSION_MS - 1;
    session.count();
    session.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("starts a new session after a long pause", () => {
    let now = 0;
    const save = vi.fn();
    const session = createMindfulSession(save, () => now);
    session.count();
    now = 70_000;
    session.count();
    now = 70_000 + SESSION_IDLE_MS + 1;
    session.count();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(new Date(0), new Date(70_000));
    session.flush();
  });

  it("is an iPhone HealthKit write-only permission, built into the app", () => {
    const plugin = fs.readFileSync("ios/App/App/MindfulHealthPlugin.swift", "utf8");
    expect(plugin).toContain("requestAuthorization(toShare: [mindful], read: [])");
    expect(fs.readFileSync("ios/App/App/App.entitlements", "utf8")).toContain("<key>com.apple.developer.healthkit</key>");
    const plist = fs.readFileSync("ios/App/App/Info.plist", "utf8");
    expect(plist).toContain("<key>NSHealthUpdateUsageDescription</key>");
    expect(plist).toContain("<key>NSHealthShareUsageDescription</key>");
    expect(fs.readFileSync("ios/App/App/ar.lproj/InfoPlist.strings", "utf8")).toContain('"NSHealthUpdateUsageDescription"');
    expect(fs.readFileSync("ios/App/App/AtharBridgeViewController.swift", "utf8")).toContain("registerPluginInstance(MindfulHealthPlugin())");
    expect(fs.readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8")).toContain("MindfulHealthPlugin.swift in Sources");
    // Android stays without Health Connect until Google Play's health declaration is filed.
    expect(fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8")).not.toContain("android.permission.health.");
  });
});
