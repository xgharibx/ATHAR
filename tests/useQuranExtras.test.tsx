// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loader = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("@/data/quranExtras", () => ({
  loadQuranExtras: loader.load,
  isQuranExtrasComplete: (extras: { englishSahih: unknown; tafsir: unknown } | null) =>
    Boolean(extras?.englishSahih && Array.isArray(extras.tafsir) && extras.tafsir.length === 6_236),
}));

import { useQuranExtras } from "@/hooks/useQuranExtras";

let container: HTMLDivElement;
let root: Root;

function QuranExtrasView() {
  const extras = useQuranExtras(true);
  return createElement("span", null, extras?.englishSahih ? "loaded" : "missing");
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loader.load.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Quran extras online recovery", () => {
  it("retries incomplete extras when connectivity returns", async () => {
    loader.load
      .mockResolvedValueOnce({ englishSahih: null, tafsir: null })
      .mockResolvedValueOnce({ englishSahih: { "1": ["", "text"] }, tafsir: Array(6_236).fill({}) });

    await act(async () => {
      root.render(createElement(QuranExtrasView));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loader.load).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("missing");

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loader.load).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe("loaded");
  });
});
