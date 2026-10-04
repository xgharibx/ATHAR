// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { idbGetExtras, idbSetExtras } = vi.hoisted(() => ({
  idbGetExtras: vi.fn(),
  idbSetExtras: vi.fn(),
}));

vi.mock("@/lib/quranIDB", () => ({ idbGetExtras, idbSetExtras }));

const DAY_MS = 24 * 60 * 60 * 1000;
const cachedAt = Date.UTC(2026, 0, 1);
const oldIndex = [{ source: "cache:old", sourceLabel: "فهرس سابق", text: "عنصر قديم محفوظ للاستعمال دون اتصال" }];

function sourceResponse(path: string) {
  if (path.includes("sharh-bundled.json")) {
    return { ok: true, json: async () => ({
      "hadith-1": {
        id: "hadith-1",
        title: "حديث نموذجي",
        hadeeth: "نص الحديث الكامل للبحث في هذا الاختبار",
        attribution: "أبو هريرة",
        explanation: "شرح مفصل ومفيد لهذا الحديث الشريف",
        hints: ["فائدة مهمة"],
      },
    }) };
  }
  if (path.includes("search-index.json")) {
    return { ok: true, json: async () => [["nawawi", "1", "retryspecialtoken appears only in the search index and survives long enough for validation", "حسن"]] };
  }
  if (path.includes("tafseer-muyassar.json")) {
    return { ok: true, json: async () => ({
      surahs: [{ id: 1, name: "الفاتحة", verses: [{ number: 1, text: "تفسير مطول لهذه الآية يحتوي على أكثر من أربعين حرفاً لاجتياز التحقق" }] }],
    }) };
  }
  throw new Error(`Unexpected knowledge source: ${path}`);
}

async function loadKnowledgeModule() {
  vi.resetModules();
  return import("@/lib/companionKnowledge");
}

beforeEach(() => {
  vi.resetAllMocks();
  idbSetExtras.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => sourceResponse(String(input))));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Companion knowledge index cache", () => {
  it("keeps using the previous index when any source fails during an expired rebuild", async () => {
    vi.spyOn(Date, "now").mockReturnValue(cachedAt + 31 * DAY_MS);
    idbGetExtras.mockResolvedValue({ cachedAt, data: oldIndex, buildVersion: 1 });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("search-index.json")) throw new TypeError("Failed to fetch");
      return sourceResponse(String(input));
    }));
    const { retrievePassagesAsync } = await loadKnowledgeModule();

    await expect(retrievePassagesAsync("عنصر", 3)).resolves.toEqual(oldIndex);
    expect(idbSetExtras).not.toHaveBeenCalled();
  });

  it("retries after a failed build and saves only a complete source set", async () => {
    idbGetExtras.mockResolvedValue(null);
    let failSearchIndex = true;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes("search-index.json") && failSearchIndex) {
        failSearchIndex = false;
        throw new TypeError("Failed to fetch");
      }
      return sourceResponse(path);
    }));
    const { retrievePassagesAsync } = await loadKnowledgeModule();

    await expect(retrievePassagesAsync("retryspecialtoken", 3)).resolves.toEqual([]);
    expect(idbSetExtras).not.toHaveBeenCalled();

    const passages = await retrievePassagesAsync("retryspecialtoken", 3);
    expect(passages).toContainEqual(expect.objectContaining({ source: "searchidx:nawawi:1:0" }));
    await vi.waitFor(() => expect(idbSetExtras).toHaveBeenCalledTimes(1));
    expect(idbSetExtras.mock.calls[0]?.[1]).toMatchObject({ buildVersion: 2 });
    expect(idbSetExtras.mock.calls[0]?.[1].data).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: expect.stringMatching(/^sharh:/) }),
      expect.objectContaining({ source: expect.stringMatching(/^searchidx:/) }),
      expect.objectContaining({ source: expect.stringMatching(/^tafsir:/) }),
    ]));
  });
});
