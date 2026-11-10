import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("bundled Quran translation loader", () => {
  it("retries a failed fetch instead of retaining a rejected promise", async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ "1": ["الرحمن الرحيم"] }),
      } as Response);
    vi.stubGlobal("fetch", fetch);
    const { getEnglishAyahTranslation } = await import("@/lib/quranTranslationLocal");

    await expect(getEnglishAyahTranslation(1, 1)).rejects.toThrow("offline");
    await expect(getEnglishAyahTranslation(1, 1)).resolves.toBe("الرحمن الرحيم");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
