// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fixtures = vi.hoisted(() => {
  const pageOne = [
    { surahId: 1, surahName: "الفاتحة", originalAyah: 1, displayAyah: 1, text: "آية الفاتحة الأولى", isBasmalahHeader: false },
    { surahId: 1, surahName: "الفاتحة", originalAyah: 2, displayAyah: 2, text: "آية الفاتحة الثانية", isBasmalahHeader: false },
  ];
  const pageTwo = [
    { surahId: 2, surahName: "البقرة", originalAyah: 1, displayAyah: 1, text: "آية البقرة الأولى", isBasmalahHeader: false },
    { surahId: 2, surahName: "البقرة", originalAyah: 2, displayAyah: 2, text: "آية البقرة الثانية", isBasmalahHeader: false },
  ];
  return {
    quranDB: [
      { id: 1, name: "الفاتحة", englishName: "Al-Fatihah", ayahs: ["آية الفاتحة الأولى", "آية الفاتحة الثانية"] },
      { id: 2, name: "البقرة", englishName: "Al-Baqarah", ayahs: ["آية البقرة الأولى", "آية البقرة الثانية"] },
    ],
    pageMap: { "1:1": 1, "1:2": 1, "2:1": 2, "2:2": 2 },
    pageIndex: { entries: [[1, pageOne], [2, pageTwo]] },
    loadTafsirSurah: vi.fn(async (_source: string, _surahId: number) => [] as string[]),
  };
});
const audioRuntime = vi.hoisted(() => ({ instances: [] as unknown[], rejectNextPlay: false }));

vi.mock("@/data/useQuranDB", () => ({
  useQuranDB: () => ({ data: fixtures.quranDB, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/data/useQuranPageMap", () => ({
  useQuranPageMap: () => ({ data: { map: fixtures.pageMap, totalPages: 2 }, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/data/useQuranPageIndex", () => ({
  useQuranPageIndex: () => ({ data: fixtures.pageIndex, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/lib/quranTranslations", () => ({
  TRANSLATION_SOURCES: [],
  getTranslationForAyah: vi.fn(async () => ""),
  loadTranslationForSurahs: vi.fn(async () => ({})),
  pruneExpiredTranslationCache: vi.fn(async () => {}),
}));
vi.mock("@/lib/quranWBW", () => ({
  downloadAllWbwSurahs: vi.fn(async () => {}),
  loadWbwSurah: vi.fn(async () => null),
  renderTajweed: vi.fn((text: string) => text),
}));
vi.mock("@/lib/tafsirEditions", () => ({
  TAFSIR_EDITIONS: [
    { slug: "muyassar", label: "الميسر" },
    { slug: "jalalayn", label: "الجلالين" },
    { slug: "tabari", label: "الطبري" },
  ],
  getTafsirEditionSlug: (source: string | null) => source === "jalalayn" || source === "tabari" ? source : null,
  getTafsirLabel: (source: string) => source === "tabari" ? "الطبري" : source === "jalalayn" ? "الجلالين" : "الميسر",
  loadTafsirSurah: fixtures.loadTafsirSurah,
}));
vi.mock("@/lib/mutashabihat", () => ({ getMutashabihatForAyah: vi.fn(async () => []) }));
vi.mock("@/lib/mushafOffline", () => ({ ensureMushafCoreOffline: vi.fn(async () => {}) }));
vi.mock("@/lib/quranIDB", () => ({ QURAN_TRANSLATION_CACHE_EXPIRED_EVENT: "quran-translation-cache-expired" }));
vi.mock("@/lib/offlineAudioCache", () => ({
  cacheAudioUrlsWithinBudget: vi.fn(async () => ({ saved: 0, evicted: 0, oversized: 0 })),
  MUSHAF_AUDIO_CACHE_NAME: "test-mushaf-audio",
}));
vi.mock("@/lib/radioPlayer", () => ({
  getRadioState: () => ({ playing: false, loading: false, stationIdx: 0 }),
  playRadio: vi.fn(),
  QURAN_RADIO_STATIONS: [],
  selectRadioStation: vi.fn(),
  stopRadio: vi.fn(),
  subscribeRadio: () => () => {},
  toggleRadio: vi.fn(),
}));
vi.mock("@/lib/sharePoster", () => ({ renderDhikrPosterBlob: vi.fn(async () => new Blob()) }));
vi.mock("@/components/quran/ShareAyahModal", () => ({ ShareAyahModal: () => null }));
vi.mock("@/components/companion/CompanionModal", () => ({ CompanionModal: () => null }));
vi.mock("@/components/quran/TranslationPicker", () => ({ TranslationPicker: () => null }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { MushafPage } from "@/pages/Mushaf";
import { useNoorStore } from "@/store/noorStore";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

class TestAudio {
  src: string;
  volume = 1;
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  pause = vi.fn();
  play = vi.fn(() => {
    if (audioRuntime.rejectNextPlay) {
      audioRuntime.rejectNextPlay = false;
      return Promise.reject(new Error("network unavailable"));
    }
    return Promise.resolve();
  });

  constructor(src: string) {
    this.src = src;
    audioRuntime.instances.push(this);
  }
}

async function mount(initialEntry = "/mushaf/1") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/mushaf/:page" element={<MushafPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  audioRuntime.instances = [];
  audioRuntime.rejectNextPlay = false;
  vi.stubGlobal("Audio", TestAudio);
  localStorage.clear();
  fixtures.loadTafsirSurah.mockReset().mockResolvedValue([]);
  useNoorStore.setState((state) => ({
    ...state,
    prefs: {
      ...state.prefs,
      quranMushafPage: 1,
      mushafShowTranslation: false,
      mushafInlineTafseer: false,
      mushafTajweedMode: false,
      mushafWbwMode: false,
    },
  }));
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Mushaf reading state across pages", () => {
  it("clears the selected ayah and its toolbar when navigating to another page", async () => {
    await mount();

    await act(async () => container.querySelector<HTMLElement>(".mushaf-ayah-span")!.click());
    expect(container.querySelector('button[aria-label="تفسير"]')).not.toBeNull();

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="الصفحة التالية"]')!.click());

    expect(container.querySelector(".mushaf-page-indicator-num")?.textContent).toBe("٢");
    expect(container.textContent).toContain("آية البقرة الأولى");
    expect(container.querySelector('button[aria-label="تفسير"]')).toBeNull();
    expect(container.querySelector<HTMLElement>(".mushaf-ayah-span")?.style.opacity).not.toBe("0.3");
  });

  it("clears the selected ayah when a horizontal swipe changes pages", async () => {
    await mount();
    await act(async () => container.querySelector<HTMLElement>(".mushaf-ayah-span")!.click());
    expect(container.querySelector('button[aria-label="تفسير"]')).not.toBeNull();

    const reader = container.querySelector<HTMLElement>(".mushaf-reader")!;
    const touch = (type: string, x: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, "touches", { value: [{ clientX: x, clientY: 100 }] });
      Object.defineProperty(event, "changedTouches", { value: [{ clientX: x, clientY: 100 }] });
      reader.dispatchEvent(event);
    };
    await act(async () => {
      touch("touchstart", 100);
      touch("touchend", 180);
    });

    expect(container.querySelector(".mushaf-page-indicator-num")?.textContent).toBe("٢");
    expect(container.querySelector('button[aria-label="تفسير"]')).toBeNull();
  });

  it("stops the failed ayah and allows playback to be retried after play rejects", async () => {
    await mount();
    audioRuntime.rejectNextPlay = true;

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="تشغيل التلاوة"]')!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('button[aria-label="تشغيل التلاوة"]')).not.toBeNull();
    expect(audioRuntime.instances).toHaveLength(1);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="تشغيل التلاوة"]')!.click();
      await Promise.resolve();
    });
    expect(audioRuntime.instances).toHaveLength(2);
  });

  it("stops the current playback when the browser emits a media error", async () => {
    await mount();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="تشغيل التلاوة"]')!.click();
      await Promise.resolve();
    });
    expect(container.querySelector('button[aria-label="إيقاف التلاوة"]')).not.toBeNull();

    const audio = audioRuntime.instances[0] as TestAudio;
    await act(async () => audio.onerror?.(new Event("error")));

    expect(container.querySelector('button[aria-label="تشغيل التلاوة"]')).not.toBeNull();
  });

  it("reports a tafsir fetch failure and retries instead of claiming no tafsir exists", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ "1": ["", "تفسير تجريبي"] }) });
    vi.stubGlobal("fetch", fetchMock);
    await mount();
    await act(async () => container.querySelector<HTMLElement>(".mushaf-ayah-span")!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="تفسير"]')!.click());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("تعذر تحميل التفسير");
    expect(container.textContent).not.toContain("لا يوجد تفسير لهذه الآية");

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="إعادة محاولة تحميل التفسير"]')!.click());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("تفسير تجريبي");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not show the previous edition while the selected tafsir source is loading", async () => {
    let resolveTabari: ((value: string[]) => void) | undefined;
    fixtures.loadTafsirSurah.mockImplementation((source) => {
      if (source === "jalalayn") return Promise.resolve(["", "شرح الجلالين"]);
      return new Promise<string[]>((resolve) => { resolveTabari = resolve; });
    });
    await mount("/mushaf/1?source=jalalayn");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("شرح الجلالين");

    await act(async () => container.querySelector<HTMLElement>(".mushaf-ayah-span")!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="تفسير"]')!.click());

    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "الطبري")!.click());
    expect(container.textContent).not.toContain("شرح الجلالين");
    expect(container.textContent).toContain("جارٍ تحميل التفسير…");

    await act(async () => {
      resolveTabari?.(["", "شرح الطبري"]);
      await Promise.resolve();
    });
    expect(container.textContent).toContain("شرح الطبري");
  });

  it("shows the memorization reveal count for the current page only", async () => {
    await mount();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="تشغيل وضع الحفظ"]')!.click());
    expect(container.querySelector(".mushaf-mem-counter")?.textContent).toBe("0/2");

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="كشف الآية ١ من سورة الفاتحة"]')!.click());
    expect(container.querySelector(".mushaf-mem-counter")?.textContent).toBe("1/2");

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="الصفحة التالية"]')!.click());
    expect(container.querySelector(".mushaf-mem-counter")?.textContent).toBe("0/2");
  });

  it("keeps each page's reveal state when showing or hiding all ayahs on another page", async () => {
    await mount();
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="تشغيل وضع الحفظ"]')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="كشف الآية ١ من سورة الفاتحة"]')!.click());

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="الصفحة التالية"]')!.click());
    expect(container.querySelector(".mushaf-mem-counter")?.textContent).toBe("0/2");
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "إظهار الكل")!.click());
    expect(container.querySelector(".mushaf-mem-counter")?.textContent).toBe("2/2");
    await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "إخفاء الكل")!.click());
    expect(container.querySelector(".mushaf-mem-counter")?.textContent).toBe("0/2");

    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="الصفحة السابقة"]')!.click());
    expect(container.querySelector(".mushaf-mem-counter")?.textContent).toBe("1/2");
  });
});
