// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import type { QuranDB } from "@/data/quranTypes";
import type { SpeechStreamHandlers } from "@/lib/voiceTasbeeh";
import { arNum } from "@/lib/formatNumber";

const speech = vi.hoisted(() => ({
  handlers: null as SpeechStreamHandlers | null,
  stop: vi.fn(),
}));

vi.mock("@/data/quranLoad", () => ({ loadQuranDB: vi.fn() }));
vi.mock("@/hooks/useScrollRestoration", () => ({ useScrollRestoration: () => {} }));
vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/voiceTasbeeh", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voiceTasbeeh")>()),
  speechAvailable: vi.fn(async () => true),
  startSpeechStream: vi.fn(async (handlers: SpeechStreamHandlers) => {
    speech.handlers = handlers;
    return speech.stop;
  }),
}));

import { loadQuranDB } from "@/data/quranLoad";
import { TasmeePage } from "@/pages/Tasmee";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The real Mushaf spelling: the recogniser writes everyday spelling.
const quran: QuranDB = [{
  id: 1,
  name: "الفاتحة",
  englishName: "Al-Fatiha",
  ayahs: ["بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"],
}];

let root: Root;
let container: HTMLDivElement;

function button(label: string): HTMLButtonElement {
  const found = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent?.includes(label));
  if (!(found instanceof HTMLButtonElement)) throw new Error(`Missing button: ${label}`);
  return found;
}

function revealedWords(): number {
  const ayah = document.body.querySelector('[aria-label="الآية المخفية"]');
  return Array.from(ayah?.querySelectorAll("span") ?? []).filter((span) => !span.className.includes("text-transparent")).length;
}

beforeEach(async () => {
  vi.useFakeTimers();
  speech.handlers = null;
  speech.stop.mockReset();
  vi.mocked(loadQuranDB).mockResolvedValue(quran);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<MemoryRouter><TasmeePage /></MemoryRouter>);
    await Promise.resolve();
  });
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  container.remove();
  document.body.innerHTML = "";
});

describe("Tasmee' by voice in the apps", () => {
  it("follows the recitation with the phone's speech recognition and moves to the next ayah", async () => {
    act(() => button("ابدأ التسميع").click());
    await act(async () => {
      button("متابعة صوتية حيّة").click();
      await Promise.resolve();
    });
    expect(speech.handlers).not.toBeNull();
    expect(speech.handlers!.hints[0]).toBe("بسم الله الرحمن الرحيم");

    act(() => speech.handlers!.onTranscript({ segment: "a", text: "بسم الله الرحمن", final: false }));
    expect(revealedWords()).toBe(2);

    act(() => speech.handlers!.onTranscript({ segment: "a", text: "بسم الله الرحمن الرحيم", final: true }));
    expect(revealedWords()).toBe(4);

    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(document.body.textContent).toContain(`الآية ${arNum(2)} من ${arNum(2)}`);
    expect(document.body.textContent).toContain(`✓ ${arNum(1)} إتقان`);

    // Uthmani «ٱلْعَٰلَمِينَ» heard as «العالمين».
    act(() => speech.handlers!.onTranscript({ segment: "b", text: "الحمد لله رب العالمين", final: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(document.body.textContent).toContain("أتممت تسميع سورة الفاتحة");
    expect(speech.stop).toHaveBeenCalled();
  });

  it("lets the person grade themselves after showing the whole ayah", async () => {
    act(() => button("ابدأ التسميع").click());
    await act(async () => {
      button("متابعة صوتية حيّة").click();
      await Promise.resolve();
    });
    act(() => button("الآية كاملة").click());
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(document.body.textContent).toContain(`الآية ${arNum(1)} من ${arNum(2)}`);
  });
});
