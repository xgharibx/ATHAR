// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyViaSelection, installClipboardFallback } from "@/lib/clipboardFallback";

function stubClipboard(writeText: (t: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

beforeEach(() => {
  document.execCommand = vi.fn(() => true) as never;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("copyViaSelection", () => {
  it("copies through a temporary textarea and cleans it up", () => {
    expect(copyViaSelection("نص")).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });
  it("reports failure when the copy command is refused", () => {
    document.execCommand = vi.fn(() => false) as never;
    expect(copyViaSelection("x")).toBe(false);
  });
});

describe("installClipboardFallback", () => {
  it("leaves a working clipboard alone", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    stubClipboard(write);
    installClipboardFallback();
    await navigator.clipboard.writeText("a");
    expect(write).toHaveBeenCalledWith("a");
    expect(document.execCommand).not.toHaveBeenCalled();
  });
  it("falls back when the async API rejects", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("NotAllowedError")));
    installClipboardFallback();
    await expect(navigator.clipboard.writeText("a")).resolves.toBeUndefined();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });
  it("still rejects when both routes fail", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    document.execCommand = vi.fn(() => false) as never;
    installClipboardFallback();
    await expect(navigator.clipboard.writeText("a")).rejects.toThrow("denied");
  });
  it("supplies a clipboard where there is none", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    installClipboardFallback();
    await expect(navigator.clipboard.writeText("a")).resolves.toBeUndefined();
  });
});
