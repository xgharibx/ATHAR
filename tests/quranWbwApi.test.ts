// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWbwSurah } from "@/lib/quranWBW";

function response(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

const validPayload = {
  verses: [{
    verse_number: 1,
    words: [
      {
        char_type_name: "word",
        text_uthmani: "بِسْمِ",
        text_uthmani_tajweed: "<rule class=ham_wasl>بِسْمِ</rule>",
        translation: { text: "In (the) name" },
        transliteration: { text: "Bismi" },
      },
      { char_type_name: "end", text_uthmani: "١" },
    ],
  }],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Quran.com word-by-word API boundary", () => {
  it("maps valid verse words and omits the verse-end marker", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(validPayload)));

    await expect(loadWbwSurah(1)).resolves.toEqual([
      [],
      [{
        ar: "بِسْمِ",
        tr: "In (the) name",
        tl: "Bismi",
        tj: "<rule class=ham_wasl>بِسْمِ</rule>",
      }],
    ]);
  });

  it("rejects malformed word fields before caching them", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        verses: [{
          verse_number: 1,
          words: [{
            char_type_name: "word",
            text_uthmani: "بِسْمِ",
            translation: null,
            transliteration: null,
          }],
        }],
      }))
      .mockResolvedValueOnce(response(validPayload));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadWbwSurah(2)).rejects.toThrow(/invalid quran\.com.*response/i);
    await expect(loadWbwSurah(2)).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts a Quran.com request that does not respond before the deadline", async () => {
    vi.useFakeTimers();
    let markFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => { markFetchStarted = resolve; });
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      markFetchStarted();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The request was aborted", "AbortError"));
        }, { once: true });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = loadWbwSurah(3);
    const timedOut = expect(request).rejects.toThrow(/timed out/i);
    await fetchStarted;
    await vi.advanceTimersByTimeAsync(30_000);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/verses/by_chapter/3?"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await timedOut;
  });
});
