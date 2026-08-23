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
let isNative = false;

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => isNative },
  registerPlugin: () => ({ shareImage, shareText: shareTextNative }),
}));

let mod: typeof import("@/lib/shareTargets");

beforeEach(async () => {
  vi.resetModules();
  shareImage.mockClear(); shareTextNative.mockClear();
  isNative = false;
  // @ts-expect-error - resetting the web share API between cases
  delete navigator.share;
  // @ts-expect-error
  delete navigator.canShare;
  mod = await import("@/lib/shareTargets");
});
afterEach(() => vi.restoreAllMocks());

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

  it("downloads when the browser cannot share files", async () => {
    expect(await mod.shareImageBlob(blob())).toBe("downloaded");
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
