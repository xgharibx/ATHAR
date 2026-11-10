// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => {
  const names = Array.from({ length: 114 }, (_, index) => `سورة ${index + 1}`);
  names[0] = "الفاتحة";
  names[1] = "البقرة";
  names[113] = "الناس";
  return {
    surahs: names.map((name, index) => ({ id: index + 1, name })),
    loadMuyassarCache: vi.fn(),
    loadTafsirSurah: vi.fn(),
  };
});

vi.mock("@/data/useQuranDB", () => ({
  useQuranDB: () => ({ data: fixtures.surahs, isLoading: false }),
}));
vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => undefined }));
vi.mock("@/lib/tafseerLocal", () => ({ loadMuyassarCache: fixtures.loadMuyassarCache }));
vi.mock("@/lib/tafsirEditions", () => ({
  TAFSIR_EDITIONS: [
    { slug: "muyassar", label: "الميسر", isBundled: true },
    { slug: "ar-tafsir-al-tabari", label: "الطبري", isBundled: false },
  ],
  getTafsirEditionSlug: (source: string | null) =>
    source === "ar-tafsir-al-tabari" ? source : null,
  loadTafsirSurah: fixtures.loadTafsirSurah,
}));

import { TafsirPage } from "@/pages/Tafsir";

let container: HTMLDivElement;
let root: Root;

async function renderTafsir(initialEntry: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/tafsir" element={<TafsirPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fixtures.loadMuyassarCache.mockReset().mockResolvedValue({
    "2": ["", "BAQARA-MUYASSAR"],
  });
  fixtures.loadTafsirSurah.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("Tafsir page navigation", () => {
  it("does not let a late previous-surah request replace the selected surah's commentary", async () => {
    let resolveOldRequest!: (ayahs: string[]) => void;
    fixtures.loadTafsirSurah.mockImplementationOnce(
      () => new Promise<string[]>((resolve) => { resolveOldRequest = resolve; }),
    );

    await renderTafsir("/tafsir?surah=1&source=ar-tafsir-al-tabari");
    await vi.waitFor(() => expect(fixtures.loadTafsirSurah).toHaveBeenCalledWith("ar-tafsir-al-tabari", 1));

    const surahSelect = container.querySelector<HTMLSelectElement>('select[aria-label="قائمة السور"]');
    expect(surahSelect).not.toBeNull();
    await act(async () => {
      surahSelect!.value = "2";
      surahSelect!.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(container.textContent).toContain("BAQARA-MUYASSAR"));

    await act(async () => {
      resolveOldRequest(["", "FATIHA-TABARI"]);
      await Promise.resolve();
    });

    expect(container.querySelector("h2")?.textContent).toBe("البقرة");
    expect(container.textContent).toContain("BAQARA-MUYASSAR");
    expect(container.textContent).not.toContain("FATIHA-TABARI");
  });

  it("makes all 114 surahs available in one keyboard-accessible picker", async () => {
    await renderTafsir("/tafsir");

    const picker = container.querySelector<HTMLSelectElement>('select[aria-label="قائمة السور"]');
    expect(picker?.options).toHaveLength(115);
    expect(picker?.querySelector('option[value="114"]')?.textContent).toContain("الناس");
    expect(container.querySelectorAll('[aria-label="قائمة السور"] button')).toHaveLength(0);
  });

  it("does not show the previous surah's commentary while the new choice loads", async () => {
    await renderTafsir("/tafsir?surah=2&source=muyassar");
    await vi.waitFor(() => expect(container.textContent).toContain("BAQARA-MUYASSAR"));

    let resolveNextCache!: (cache: Record<string, string[]>) => void;
    fixtures.loadMuyassarCache.mockImplementationOnce(
      () => new Promise<Record<string, string[]>>((resolve) => { resolveNextCache = resolve; }),
    );

    const picker = container.querySelector<HTMLSelectElement>('select[aria-label="قائمة السور"]')!;
    await act(async () => {
      picker.value = "1";
      picker.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("h2")?.textContent).toBe("الفاتحة");
    expect(container.textContent).not.toContain("BAQARA-MUYASSAR");
    expect(container.textContent).toContain("جارٍ تحميل التفسير");

    await act(async () => {
      resolveNextCache({ "1": ["", "FATIHA-MUYASSAR"] });
      await Promise.resolve();
    });
    expect(container.textContent).toContain("FATIHA-MUYASSAR");
  });
});
