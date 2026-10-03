// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTafsirSurah } from "@/lib/tafsirEditions";

describe("tafsir edition URL validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects an unknown edition before making a CDN request", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => [{ ayah: 1, surah: 1, text: "unexpected tafsir response" }],
    }) as Response);
    vi.stubGlobal("fetch", mockFetch);

    await expect(loadTafsirSurah("../../unknown-edition", 1)).rejects.toThrow("Unknown tafsir edition");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
