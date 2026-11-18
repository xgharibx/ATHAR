import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

const plugin = vi.hoisted(() => ({
  download: vi.fn(async (_options: unknown) => ({ saved: 2, failed: 0, evicted: 0 })),
  addListener: vi.fn(async () => ({ remove: vi.fn(async () => undefined) })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
  registerPlugin: vi.fn(() => plugin),
}));

import { saveRecitationsOffline } from "@/lib/recitationDownloads";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("recitation downloads that carry on in the background", () => {
  it("hands the phone the verses and the title for its notification", async () => {
    const result = await saveRecitationsOffline(["https://everyayah.com/data/A/001001.mp3"], () => {}, "اكتمل تنزيل الفاتحة");
    expect(result).toEqual({ saved: 2, evicted: 0 });
    expect(plugin.download).toHaveBeenCalledWith(expect.objectContaining({ title: "اكتمل تنزيل الفاتحة" }));
  });

  it("Android: a WorkManager job that resumes, waits for a network, and says when it is done", () => {
    const worker = read("android/app/src/main/java/com/athar/adhkar/RecitationDownloadWorker.java");
    expect(worker).toContain("ExistingWorkPolicy.APPEND_OR_REPLACE");
    expect(worker).toContain("NetworkType.CONNECTED");
    expect(worker).toContain("if (isStopped()) return Result.retry();");
    expect(worker).toContain("notifyDone(");
    expect(read("android/app/src/main/java/com/athar/adhkar/QuranAudioPlugin.java")).toContain("RecitationDownloadWorker.enqueue(");
    for (const file of ["values/strings.xml", "values-ar/strings.xml"]) {
      expect(read(`android/app/src/main/res/${file}`)).toContain('name="downloads_done_all"');
    }
  });

  it("iPhone: a background download session that wakes the app to file each verse", () => {
    const downloads = read("ios/App/App/RecitationBackgroundDownloads.swift");
    expect(downloads).toContain("URLSessionConfiguration.background(withIdentifier:");
    expect(downloads).toContain("configuration.sessionSendsLaunchEvents = true");
    expect(downloads).toContain("func urlSessionDidFinishEvents(forBackgroundURLSession");
    const appDelegate = read("ios/App/App/AppDelegate.swift");
    expect(appDelegate).toContain("handleEventsForBackgroundURLSession identifier: String");
    expect(read("ios/App/App/QuranAudioPlugin.swift")).toContain("RecitationBackgroundDownloads.shared");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("RecitationBackgroundDownloads.swift in Sources");
  });
});
