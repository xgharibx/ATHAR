// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { idbGetHadithPack, idbSetHadithPack } = vi.hoisted(() => ({
  idbGetHadithPack: vi.fn(),
  idbSetHadithPack: vi.fn(),
}));

vi.mock("@/lib/hadithIDB", () => ({ idbGetHadithPack, idbSetHadithPack }));

import { loadHadithPack, loadHadithPackWithProgress } from "@/data/useHadithBook";

describe("Hadith pack loading errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    idbGetHadithPack.mockResolvedValue(null);
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
});
