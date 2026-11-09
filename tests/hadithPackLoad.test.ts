// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { idbGetHadithPackEntry, idbSetHadithPack } = vi.hoisted(() => ({
  idbGetHadithPackEntry: vi.fn(),
  idbSetHadithPack: vi.fn(),
}));

vi.mock("@/lib/hadithIDB", () => ({ idbGetHadithPackEntry, idbSetHadithPack }));

import { loadHadithPack, loadHadithPackWithProgress } from "@/data/useHadithBook";

describe("Hadith pack loading errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    idbGetHadithPackEntry.mockResolvedValue(null);
    idbSetHadithPack.mockResolvedValue(undefined);
  });

  it("rejects a failed download instead of returning a cacheable null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(loadHadithPack("nawawi")).rejects.toThrow("Failed to fetch");
  });

  it("lets the progress query show its error state and accept a retry", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ hadiths: [{ n: 1, s: 1, t: "حديث" }] }),
      }));

    await expect(loadHadithPackWithProgress("nawawi", vi.fn(), vi.fn()))
      .rejects.toThrow("Failed to fetch");
    await expect(loadHadithPackWithProgress("nawawi", vi.fn(), vi.fn()))
      .resolves.toMatchObject({ hadiths: [{ n: 1 }] });
  });

  it("reassembles streamed UTF-8 chunks before parsing a Hadith pack", async () => {
    const pack = { hadiths: [{ n: 1, s: 1, t: "حديث نبوي" }] };
    const bytes = new TextEncoder().encode(JSON.stringify(pack));
    const arabicOffset = new TextEncoder().encode(JSON.stringify({ hadiths: [{ n: 1, s: 1, t: "" }] })).length;
    const splitAt = arabicOffset + 1;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, splitAt));
        controller.enqueue(bytes.subarray(splitAt));
        controller.close();
      },
    });
    const onProgress = vi.fn();
    const setIsFromCache = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Length": String(bytes.length) }),
      body,
    }));

    await expect(loadHadithPackWithProgress("nawawi", onProgress, setIsFromCache)).resolves.toEqual(pack);

    expect(setIsFromCache).toHaveBeenCalledWith(false);
    expect(onProgress).toHaveBeenLastCalledWith(100);
    expect(idbSetHadithPack).toHaveBeenCalledWith(pack);
  });
});
