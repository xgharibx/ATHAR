/**
 * @vitest-environment jsdom
 *
 * "Share as photo" produced nothing in the Android and iOS apps: the code
 * relied on navigator.share({ files }), which the Capacitor WebView does not
 * expose, so it fell through to an <a download> click a WebView has nowhere to
 * put. Native now goes through ShareBridge.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shareImage = vi.fn().mockResolvedValue(undefined);
const shareTextNative = vi.fn().mockResolvedValue(undefined);
const shareFileNative = vi.fn().mockResolvedValue(undefined);
const registerPlugin = vi.fn(() => ({ shareImage, shareText: shareTextNative, shareFile: shareFileNative }));
let isNative = false;

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => isNative },
  registerPlugin,
}));

let mod: typeof import("@/lib/shareTargets");

beforeEach(async () => {
  vi.resetModules();
  shareImage.mockReset().mockResolvedValue(undefined);
  shareTextNative.mockReset().mockResolvedValue(undefined);
  shareFileNative.mockReset().mockResolvedValue(undefined);
  registerPlugin.mockReset().mockImplementation(() => ({ shareImage, shareText: shareTextNative, shareFile: shareFileNative }));
  isNative = false;
  // @ts-expect-error - resetting the web share API between cases
  delete navigator.share;
  // @ts-expect-error
  delete navigator.canShare;
  mod = await import("@/lib/shareTargets");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const blob = () => new Blob(["x"], { type: "image/png" });

describe("native apps", () => {
  it("shares an image through the native bridge", async () => {
    isNative = true;
    const r = await mod.shareImageBlob(blob(), { filename: "a.png" });
    expect(shareImage).toHaveBeenCalledTimes(1);
    expect(r).toBe("shared");
  });

  it("passes a base64 payload, since the bridge cannot take a Blob", async () => {
    isNative = true;
    await mod.shareImageBlob(blob());
    expect(typeof shareImage.mock.calls[0]![0].base64).toBe("string");
    expect(shareImage.mock.calls[0]![0].base64.length).toBeGreaterThan(0);
  });

  it("shares text through the native bridge", async () => {
    isNative = true;
    expect(await mod.shareText("سبحان الله")).toBe("shared");
    expect(shareTextNative).toHaveBeenCalled();
  });

  it("shares backup files through the native bridge with their type and filename", async () => {
    isNative = true;
    const backup = new Blob(["{\"version\":1}"], { type: "application/json" });

    expect(await mod.shareFileBlob(backup, { filename: "backup.athar", title: "ATHAR backup" })).toBe("shared");

    expect(shareFileNative).toHaveBeenCalledTimes(1);
    expect(shareFileNative.mock.calls[0]![0]).toMatchObject({
      filename: "backup.athar",
      mimeType: "application/json",
      title: "ATHAR backup",
    });
    expect(shareFileNative.mock.calls[0]![0].base64).toContain("base64,");
  });

  it("reports native file bridge failures without falling back to a WebView download", async () => {
    isNative = true;
    shareFileNative.mockRejectedValueOnce(new Error("share bridge unavailable"));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    expect(await mod.shareFileBlob(new Blob(["backup"]), { filename: "backup.athar" })).toBe("failed");
    expect(click).not.toHaveBeenCalled();
  });

  it("fails closed when native file bridge registration fails", async () => {
    isNative = true;
    registerPlugin.mockImplementationOnce(() => { throw new Error("registration failed"); });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    expect(await mod.shareFileBlob(new Blob(["backup"]), { filename: "backup.athar" })).toBe("failed");
    expect(click).not.toHaveBeenCalled();
  });

  it("does not touch the bridge on the web", async () => {
    await mod.shareImageBlob(blob());
    expect(shareImage).not.toHaveBeenCalled();
  });
});

describe("web fallbacks", () => {
  it("uses the Web Share API when it accepts files", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });
    expect(await mod.shareImageBlob(blob())).toBe("shared");
    expect(share).toHaveBeenCalled();
  });

  it("shares backup files with Web Share when the browser accepts files", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });

    expect(await mod.shareFileBlob(new Blob(["backup"], { type: "application/json" }), { filename: "backup.athar", title: "ATHAR نسخة احتياطية" })).toBe("shared");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "ATHAR نسخة احتياطية" }));
  });

  it("downloads when the browser cannot share files", async () => {
    expect(await mod.shareImageBlob(blob())).toBe("downloaded");
  });

  it("downloads a backup in the browser and keeps its object URL alive for the download", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => "blob:backup");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.useFakeTimers();

    expect(await mod.shareFileBlob(new Blob(["backup"], { type: "application/json" }), { filename: "backup.athar" })).toBe("downloaded");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup");
  });

  it("releases a backup object URL after a browser download click fails", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { throw new Error("download blocked"); });
    const createObjectURL = vi.fn(() => "blob:backup");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.useFakeTimers();

    expect(await mod.shareFileBlob(new Blob(["backup"], { type: "application/json" }), { filename: "backup.athar" })).toBe("failed");
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup");
  });
});

describe("app invitation", () => {
  it("appends the store link to shared text", async () => {
    isNative = true;
    await mod.shareText("سبحان الله");
    expect(shareTextNative.mock.calls[0]![0].text).toContain(mod.STORE_LINKS.android);
  });

  it("names the app, not just a bare link", async () => {
    expect(mod.appInvite()).toContain("أثر");
  });

  it("never appends it twice", async () => {
    const once = mod.withInvite("ذكر");
    expect(mod.withInvite(once)).toBe(once);
  });

  it("rides along with a shared image too", async () => {
    isNative = true;
    await mod.shareImageBlob(blob(), { text: "ذكر" });
    expect(shareImage.mock.calls[0]![0].text).toContain(mod.STORE_LINKS.android);
  });
});
