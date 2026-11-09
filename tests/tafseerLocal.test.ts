import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bundled Muyassar loading", () => {
  it("rejects a failed request so callers can show an error and retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ "1": ["", "تفسير سورة الفاتحة"] }) });
    vi.stubGlobal("fetch", fetchMock);
    const { getMuyassarAyahsSync, loadMuyassarCache } = await import("@/lib/tafseerLocal");

    await expect(loadMuyassarCache()).rejects.toThrow("HTTP 503");
    expect(getMuyassarAyahsSync(1)).toEqual([]);

    const recovered = await loadMuyassarCache();
    expect(recovered["1"]?.[1]).toBe("تفسير سورة الفاتحة");
    expect(await loadMuyassarCache()).toBe(recovered);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
