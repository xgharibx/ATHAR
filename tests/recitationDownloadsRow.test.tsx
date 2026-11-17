// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ available: true, bytes: 150 * 1024 * 1024, clear: vi.fn(async () => true) }));
vi.mock("@/lib/nativeRecitation", () => ({
  hasNativeRecitation: () => native.available,
  downloadedRecitationBytes: async () => (native.available ? native.bytes : null),
  clearDownloadedRecitations: native.clear,
}));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { RecitationDownloadsRow } from "@/components/quran/RecitationDownloadsRow";
import { formatStorageSize } from "@/lib/storageSize";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(RecitationDownloadsRow)));
}

const button = (name: string) => Array.from(container!.querySelectorAll("button")).find((b) => b.textContent?.trim() === name);

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  native.available = true;
  native.clear.mockClear();
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

describe("downloaded recitations", () => {
  it("formats storage sizes in Arabic units", () => {
    expect(formatStorageSize(512 * 1024)).toBe("٥١٢ ك.ب");
    expect(formatStorageSize(150 * 1024 * 1024)).toBe("١٥٠ م.ب");
    expect(formatStorageSize(1.5 * 1024 * 1024 * 1024)).toBe("١٫٥ ج.ب");
  });

  it("shows the space used and deletes only after a second tap", async () => {
    await mount();
    expect(container!.textContent).toContain("١٥٠ م.ب");
    await act(async () => button("حذف")!.click());
    expect(native.clear).not.toHaveBeenCalled();
    await act(async () => button("تأكيد الحذف")!.click());
    expect(native.clear).toHaveBeenCalledOnce();
    expect(container!.textContent).toContain("لا توجد تلاوات محمّلة");
  });

  it("is hidden on the web", async () => {
    native.available = false;
    await mount();
    expect(container!.textContent).toBe("");
  });
});
