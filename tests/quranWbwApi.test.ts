// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWbwSurah } from "@/lib/quranWBW";
import { getSurahAyahCount } from "@/data/quranSurahCounts";

function response(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

function validPayload(surahId = 1) {
  return {
    verses: Array.from({ length: getSurahAyahCount(surahId) }, (_, index) => ({
      verse_number: index + 1,
      words: [
        {
          char_type_name: "word",
          text_uthmani: index === 0 ? "بِسْمِ" : "نَصٌّ",
          text_uthmani_tajweed: index === 0 ? "<rule class=ham_wasl>بِسْمِ</rule>" : "نَصٌّ",
          translation: { text: "In (the) name" },
          transliteration: { text: "Bismi" },
        },
        { char_type_name: "end", text_uthmani: `${index + 1}` },
      ],
    })),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Quran.com word-by-word API boundary", () => {
  it("rejects verses outside the requested surah and incomplete chapter responses", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ verses: [{ ...validPayload(114).verses[0], verse_number: 286 }] }))
      .mockResolvedValueOnce(response({ verses: [validPayload(113).verses[0]] })));

    await expect(loadWbwSurah(114)).rejects.toThrow(/invalid quran\.com.*response/i);
    await expect(loadWbwSurah(113)).rejects.toThrow(/invalid quran\.com.*response/i);
  });

  it("maps valid verse words and omits the verse-end marker", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(validPayload(1))));

    await expect(loadWbwSurah(1)).resolves.toEqual([
      [],
      [{
        ar: "بِسْمِ",
        tr: "In (the) name",
        tl: "Bismi",
        tj: "<rule class=ham_wasl>بِسْمِ</rule>",
      }],
      ...Array.from({ length: 6 }, () => [{ ar: "نَصٌّ", tr: "In (the) name", tl: "Bismi", tj: "نَصٌّ" }]),
    ]);
  });

  it("rejects malformed word fields before caching them", async () => {
    const malformedPayload = validPayload(2) as unknown as { verses: Array<{ words: Array<Record<string, unknown>> }> };
    malformedPayload.verses[0]!.words[0]!.translation = null;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(malformedPayload))
      .mockResolvedValueOnce(response(validPayload(2)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadWbwSurah(2)).rejects.toThrow(/invalid quran\.com.*response/i);
    await expect(loadWbwSurah(2)).resolves.toHaveLength(getSurahAyahCount(2) + 1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes an IndexedDB response once it is older than seven days", async () => {
    const now = Date.UTC(2026, 0, 1);
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const fetchMock = vi.fn().mockResolvedValue(response(validPayload(4)));
    vi.stubGlobal("fetch", fetchMock);

    await loadWbwSurah(4);
    clock.mockReturnValue(now + 8 * 24 * 60 * 60 * 1000);
    await loadWbwSurah(4);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deletes an expired persisted row when the refresh cannot complete", async () => {
    const now = Date.UTC(2026, 0, 1);
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(validPayload(5)))
      .mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await loadWbwSurah(5);
    clock.mockReturnValue(now + 8 * 24 * 60 * 60 * 1000);
    await expect(loadWbwSurah(5)).rejects.toThrow("offline");

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("noor-wbw-cache-v4");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const row = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction("wbwCache").objectStore("wbwCache").get("wbw_5");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    expect(row).toBeUndefined();
  });

  it("aborts a Quran.com request that does not respond before the deadline", async () => {
    // Open the fake IndexedDB database before fake timers so its transaction
    // scheduling does not get suspended by this test's deadline clock.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(validPayload(6))));
    await loadWbwSurah(6);
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
